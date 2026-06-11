import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import ProgressRing from '../components/ProgressRing';

const WeightLossScreen = ({ navigation }) => {
  const [selectedWeek, setSelectedWeek] = useState(0);

  const weekData = [
    { week: 'Week 1', loss: '0.5 kg', calories: 1800, focus: 'Start light cardio' },
    { week: 'Week 2', loss: '0.8 kg', calories: 1700, focus: 'Increase cardio + diet' },
    { week: 'Week 3', loss: '1.0 kg', calories: 1650, focus: 'Add strength training' },
    { week: 'Week 4', loss: '1.2 kg', calories: 1600, focus: 'Intensify workouts' },
  ];

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Weight Loss Program" subtitle="AI-Powered Fat Burning Plan" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Progress Summary */}
        <GradientCard colors={['#FF6B6B15', COLORS.darkCard]} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <ProgressRing progress={35} size={100} strokeWidth={10} color={COLORS.secondary} value="35%" label="Fat Loss" />
            <View style={styles.summaryInfo}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Current Weight</Text>
                <Text style={styles.summaryValue}>70 kg</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Target Weight</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>65 kg</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Calorie Deficit</Text>
                <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>-500 kcal</Text>
              </View>
            </View>
          </View>
        </GradientCard>

        {/* Fat Burning Workouts */}
        <Text style={styles.sectionTitle}>🔥 Fat Burning Workouts</Text>
        {[
          { name: 'HIIT Cardio', duration: '20 min', calories: 250, level: 'Intermediate', icon: '⚡' },
          { name: 'Running', duration: '30 min', calories: 300, level: 'Beginner', icon: '🏃' },
          { name: 'Jump Rope', duration: '15 min', calories: 200, level: 'Intermediate', icon: '🪢' },
          { name: 'Burpees Circuit', duration: '15 min', calories: 180, level: 'Advanced', icon: '💪' },
          { name: 'Cycling', duration: '30 min', calories: 280, level: 'Beginner', icon: '🚴' },
        ].map((w, i) => (
          <TouchableOpacity key={i} style={styles.workoutItem}>
            <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.workoutGrad}>
              <Text style={styles.workoutIcon}>{w.icon}</Text>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName}>{w.name}</Text>
                <Text style={styles.workoutMeta}>{w.duration} • {w.level}</Text>
              </View>
              <View style={styles.calBadge}>
                <Text style={styles.calText}>-{w.calories}</Text>
                <Text style={styles.calUnit}>kcal</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* Weekly Plan */}
        <Text style={styles.sectionTitle}>📅 Weekly Plan</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
          {weekData.map((w, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.weekCard, selectedWeek === i && styles.weekCardActive]}
              onPress={() => setSelectedWeek(i)}
            >
              <Text style={[styles.weekTitle, selectedWeek === i && { color: COLORS.secondary }]}>{w.week}</Text>
              <Text style={styles.weekLoss}>{w.loss}</Text>
              <Text style={styles.weekCal}>{w.calories} kcal/day</Text>
              <Text style={styles.weekFocus}>{w.focus}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Diet Tips */}
        <Text style={styles.sectionTitle}>🥗 Weight Loss Diet Tips</Text>
        <GradientCard>
          {[
            { icon: '🚫', text: 'Avoid sugar, junk food, and processed items' },
            { icon: '🥗', text: 'Eat more protein-rich foods and fiber' },
            { icon: '🍵', text: 'Drink green tea and warm water in morning' },
            { icon: '⏰', text: 'Don\'t eat after 8 PM, try intermittent fasting' },
            { icon: '🍎', text: 'Eat fruits and salads as snacks' },
            { icon: '💧', text: 'Drink 3-4 liters of water daily' },
          ].map((t, i) => (
            <View key={i} style={styles.tipItem}>
              <Text style={styles.tipIcon}>{t.icon}</Text>
              <Text style={styles.tipText}>{t.text}</Text>
            </View>
          ))}
        </GradientCard>

        {/* Belly Fat Tips */}
        <Text style={styles.sectionTitle}>🎯 Belly Fat Reduction</Text>
        <GradientCard colors={['#FF980015', COLORS.darkCard]}>
          {[
            'Do planks and crunches daily',
            'Avoid alcohol and sugary drinks',
            'Reduce stress levels with meditation',
            'Get 7-8 hours of sleep',
            'Include high-fiber foods in diet',
          ].map((t, i) => (
            <View key={i} style={styles.bulletItem}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}
        </GradientCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  summaryCard: { marginBottom: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryInfo: { flex: 1, marginLeft: 20 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  summaryValue: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 16 },
  workoutItem: { marginBottom: 10, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  workoutGrad: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: SIZES.radius },
  workoutIcon: { fontSize: 28, marginRight: 14 },
  workoutInfo: { flex: 1 },
  workoutName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  workoutMeta: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  calBadge: { alignItems: 'center', backgroundColor: COLORS.secondary + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  calText: { fontSize: SIZES.fontMd, color: COLORS.secondary, ...FONTS.bold },
  calUnit: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  weekScroll: { marginBottom: 24 },
  weekCard: {
    width: 140, padding: 16, marginRight: 12,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  weekCardActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary + '10' },
  weekTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, marginBottom: 6 },
  weekLoss: { fontSize: SIZES.fontXl, color: COLORS.secondary, ...FONTS.bold, marginBottom: 4 },
  weekCal: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginBottom: 4 },
  weekFocus: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  tipIcon: { fontSize: 20, marginRight: 12 },
  tipText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },
  bulletItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.warning, marginRight: 12 },
  bulletText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },
});

export default WeightLossScreen;
