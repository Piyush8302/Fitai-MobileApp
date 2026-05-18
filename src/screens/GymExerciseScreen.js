import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { WORKOUT_CATEGORIES, EXERCISES } from '../constants/data';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';

const GymExerciseScreen = ({ navigation }) => {
  const [selectedMuscle, setSelectedMuscle] = useState('chest');
  const [expandedEx, setExpandedEx] = useState(null);

  const exercises = EXERCISES[selectedMuscle] || EXERCISES.chest;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Gym Exercise Guide" subtitle="Learn Proper Form" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Muscle Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScroll}>
          {WORKOUT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.muscleChip, selectedMuscle === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}
              onPress={() => { setSelectedMuscle(cat.id); setExpandedEx(null); }}
            >
              <Text style={styles.muscleIcon}>{cat.icon}</Text>
              <Text style={[styles.muscleText, selectedMuscle === cat.id && { color: cat.color }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise Cards */}
        {exercises.map((ex, i) => (
          <TouchableOpacity
            key={i}
            style={styles.exCard}
            onPress={() => setExpandedEx(expandedEx === i ? null : i)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.exGrad}>
              {/* Header */}
              <View style={styles.exHeader}>
                <View style={styles.exTitleRow}>
                  <View style={[styles.exNum, { backgroundColor: WORKOUT_CATEGORIES.find(c => c.id === selectedMuscle)?.color + '20' }]}>
                    <Text style={[styles.exNumText, { color: WORKOUT_CATEGORIES.find(c => c.id === selectedMuscle)?.color }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.exTitleInfo}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exMuscle}>{ex.muscle}</Text>
                  </View>
                </View>
                <Ionicons
                  name={expandedEx === i ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.qStat}>
                  <Text style={styles.qStatIcon}>🔄</Text>
                  <Text style={styles.qStatVal}>{ex.sets}×{ex.reps}</Text>
                </View>
                <View style={styles.qStat}>
                  <Text style={styles.qStatIcon}>⏱️</Text>
                  <Text style={styles.qStatVal}>{ex.duration}</Text>
                </View>
                <View style={styles.qStat}>
                  <Text style={styles.qStatIcon}>🔥</Text>
                  <Text style={styles.qStatVal}>{ex.calories} kcal</Text>
                </View>
                <View style={[styles.diffTag, {
                  backgroundColor: ex.difficulty === 'Beginner' ? COLORS.success + '20' :
                    ex.difficulty === 'Intermediate' ? COLORS.warning + '20' : COLORS.secondary + '20'
                }]}>
                  <Text style={[styles.diffTagText, {
                    color: ex.difficulty === 'Beginner' ? COLORS.success :
                      ex.difficulty === 'Intermediate' ? COLORS.warning : COLORS.secondary
                  }]}>{ex.difficulty}</Text>
                </View>
              </View>

              {/* Expanded Details */}
              {expandedEx === i && (
                <View style={styles.expanded}>
                  <View style={styles.divider} />

                  {/* Animated Placeholder */}
                  <View style={styles.animPlaceholder}>
                    <LinearGradient colors={[COLORS.primary + '10', COLORS.darkBorder + '20']} style={styles.animBox}>
                      <Text style={styles.animIcon}>🎬</Text>
                      <Text style={styles.animText}>Exercise Animation</Text>
                      <Text style={styles.animSub}>Tap to play demo</Text>
                    </LinearGradient>
                  </View>

                  {/* Correct Posture */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailIcon}>✅</Text>
                      <Text style={styles.detailTitle}>Correct Posture</Text>
                    </View>
                    <Text style={styles.detailText}>{ex.tips}</Text>
                  </View>

                  {/* Common Mistakes */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailIcon}>❌</Text>
                      <Text style={styles.detailTitle}>Common Mistakes</Text>
                    </View>
                    <Text style={styles.detailText}>
                      {ex.name === 'Push Ups' ? 'Sagging hips, flaring elbows too wide, not going full range' :
                       ex.name === 'Bench Press' ? 'Bouncing bar off chest, uneven grip, not using leg drive' :
                       'Using momentum instead of controlled movement, ego lifting too heavy'}
                    </Text>
                  </View>

                  {/* Injury Prevention */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailIcon}>🛡️</Text>
                      <Text style={styles.detailTitle}>Injury Prevention</Text>
                    </View>
                    <Text style={styles.detailText}>
                      Warm up properly before starting. Use proper form over heavy weight. Stop if you feel sharp pain.
                    </Text>
                  </View>

                  {/* Targeted Muscles */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailIcon}>🎯</Text>
                      <Text style={styles.detailTitle}>Muscles Targeted</Text>
                    </View>
                    <View style={styles.muscleTagRow}>
                      {ex.muscle.split(', ').map((m, j) => (
                        <View key={j} style={styles.muscleTag}>
                          <Text style={styles.muscleTagText}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  muscleScroll: { marginBottom: 20 },
  muscleChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: 24, marginRight: 10,
    borderWidth: 1.5, borderColor: COLORS.darkBorder,
  },
  muscleIcon: { fontSize: 16, marginRight: 6 },
  muscleText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  exCard: { marginBottom: 14, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  exGrad: { padding: 16, borderRadius: SIZES.radiusLg },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  exNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exNumText: { fontSize: SIZES.fontLg, ...FONTS.bold },
  exTitleInfo: { flex: 1 },
  exName: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  exMuscle: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  quickStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  qStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qStatIcon: { fontSize: 14 },
  qStatVal: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  diffTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  diffTagText: { fontSize: SIZES.fontXs, ...FONTS.bold },
  expanded: { marginTop: 12 },
  divider: { height: 1, backgroundColor: COLORS.darkBorder, marginBottom: 16 },
  animPlaceholder: { marginBottom: 16 },
  animBox: {
    height: 160, borderRadius: SIZES.radius,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.darkBorder, borderStyle: 'dashed',
  },
  animIcon: { fontSize: 36, marginBottom: 8 },
  animText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.semiBold },
  animSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 4 },
  detailSection: { marginBottom: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailIcon: { fontSize: 16, marginRight: 8 },
  detailTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  detailText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 22, paddingLeft: 24 },
  muscleTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 24 },
  muscleTag: { backgroundColor: COLORS.primary + '15', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  muscleTagText: { fontSize: SIZES.fontSm, color: COLORS.primaryLight, ...FONTS.medium },
});

export default GymExerciseScreen;
