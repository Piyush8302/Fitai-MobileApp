import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

const MUSCLE_ICONS = {
  chest: '🏋️', back: '🔙', legs: '🦵', shoulders: '💪', biceps: '💪',
  triceps: '💪', abs: '🧱', glutes: '🍑', full_body: '🏃',
};

const ExerciseLibraryScreen = ({ navigation }) => {
  const [exercises, setExercises] = useState([]);
  const [muscles, setMuscles] = useState([]);
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMuscles = async () => {
      try {
        const res = await api.get(ENDPOINTS.EXERCISES_MUSCLES);
        if (res.success) setMuscles(res.data);
      } catch (e) { console.log(e); }
    };
    loadMuscles();
  }, []);

  useEffect(() => {
    const loadExercises = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedMuscle) params.muscle = selectedMuscle;
        const res = await api.get(ENDPOINTS.EXERCISES, params);
        if (res.success) setExercises(res.data);
      } catch (e) { console.log(e); }
      setLoading(false);
    };
    loadExercises();
  }, [selectedMuscle]);

  const renderExercise = ({ item }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={styles.exerciseCard}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.exerciseGradient}>
          <View style={styles.exerciseHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: COLORS.primary + '20' }]}>
                  <Text style={[styles.badgeText, { color: COLORS.primary }]}>{item.muscle}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: COLORS.warning + '20' }]}>
                  <Text style={[styles.badgeText, { color: COLORS.warning }]}>{item.equipment}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: item.difficulty === 'beginner' ? COLORS.success + '20' : item.difficulty === 'advanced' ? COLORS.secondary + '20' : COLORS.accent + '20' }]}>
                  <Text style={[styles.badgeText, { color: item.difficulty === 'beginner' ? COLORS.success : item.difficulty === 'advanced' ? COLORS.secondary : COLORS.accent }]}>{item.difficulty}</Text>
                </View>
              </View>
            </View>
            <View style={styles.setsBox}>
              <Text style={styles.setsText}>{item.sets}×{item.reps}</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>📋 Instructions</Text>
              <Text style={styles.instructions}>{item.instructions}</Text>
              <Text style={styles.sectionLabel}>💡 Tips</Text>
              <Text style={styles.tips}>{item.tips}</Text>
              {item.secondaryMuscles?.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>🎯 Secondary Muscles</Text>
                  <View style={styles.secondaryRow}>
                    {item.secondaryMuscles.map((m, i) => (
                      <View key={i} style={styles.secondaryChip}>
                        <Text style={styles.secondaryText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.calBurn}>🔥 ~{item.calories_per_set} cal/set</Text>
            </View>
          )}

          <View style={styles.expandHint}>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Exercise Library" subtitle="32 exercises with instructions" onBack={() => navigation.goBack()} />

      {/* Muscle Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.muscleChip, !selectedMuscle && styles.muscleActive]}
          onPress={() => setSelectedMuscle(null)}
        >
          <Text style={[styles.muscleText, !selectedMuscle && styles.muscleTextActive]}>🏋️ All</Text>
        </TouchableOpacity>
        {muscles.map((m, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.muscleChip, selectedMuscle === m.name && styles.muscleActive]}
            onPress={() => setSelectedMuscle(selectedMuscle === m.name ? null : m.name)}
          >
            <Text style={[styles.muscleText, selectedMuscle === m.name && styles.muscleTextActive]}>
              {MUSCLE_ICONS[m.name] || '💪'} {m.name} ({m.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={exercises}
          renderItem={renderExercise}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No exercises found</Text>}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { maxHeight: 52, marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingVertical: 4 },
  muscleChip: {
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  muscleActive: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary },
  muscleText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  muscleTextActive: { color: COLORS.primary },
  list: { padding: 16, paddingBottom: 100 },
  exerciseCard: { marginBottom: 12, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  exerciseGradient: { padding: 14, borderRadius: SIZES.radiusLg },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exerciseName: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, ...FONTS.bold, textTransform: 'capitalize' },
  setsBox: { backgroundColor: COLORS.primary + '20', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  setsText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
  expandedContent: { marginTop: 8 },
  divider: { height: 1, backgroundColor: COLORS.darkBorder, marginVertical: 10 },
  sectionLabel: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold, marginBottom: 4, marginTop: 8 },
  instructions: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.regular, lineHeight: 22 },
  tips: { fontSize: SIZES.fontMd, color: COLORS.success, ...FONTS.medium, lineHeight: 22, fontStyle: 'italic' },
  secondaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  secondaryChip: { backgroundColor: COLORS.accent + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  secondaryText: { fontSize: SIZES.fontXs, color: COLORS.accent, ...FONTS.medium, textTransform: 'capitalize' },
  calBurn: { fontSize: SIZES.fontSm, color: COLORS.secondary, ...FONTS.bold, marginTop: 8 },
  expandHint: { alignItems: 'center', marginTop: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});

export default ExerciseLibraryScreen;
