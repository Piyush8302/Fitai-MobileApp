import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

const MUSCLE_ICON = {
  chest: '🏋️', back: '🚣', legs: '🏃', shoulders: '💪',
  biceps: '💪', triceps: '🔥', abs: '⚡', glutes: '🍑', forearms: '✊',
};
const iconFor = (m) => MUSCLE_ICON[m] || '🏋️';
const label = (s = '') => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const DIFF_COLOR = { beginner: COLORS.success, intermediate: COLORS.warning, advanced: COLORS.error };

const GymExerciseScreen = ({ navigation, route }) => {
  // Opened from a list → show that exercise. Opened on its own → browse.
  const passed = route?.params?.exercise || null;

  const [muscles, setMuscles] = useState([]);
  const [selectedMuscle, setSelectedMuscle] = useState('chest');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(!passed);
  const [openId, setOpenId] = useState(null);

  const loadBrowse = useCallback(async () => {
    if (passed) return;
    setLoading(true);
    try {
      const [m, ex] = await Promise.all([
        api.get(ENDPOINTS.EXERCISES_MUSCLES),
        api.get(ENDPOINTS.EXERCISES, { muscle: selectedMuscle, limit: 30 }),
      ]);
      if (m.success && Array.isArray(m.data)) setMuscles(m.data);
      setList(ex.success && Array.isArray(ex.data) ? ex.data : []);
    } catch (e) {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [passed, selectedMuscle]);

  useEffect(() => { loadBrowse(); }, [loadBrowse]);

  // ── detail view ───────────────────────────────────────────────────────
  if (passed) {
    const steps = String(passed.instructions || '')
      .split(/(?<=\.)\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <Header title={passed.name} subtitle={label(passed.muscle)} onBack={() => navigation.goBack()} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {passed.images?.length ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.shots}>
              {passed.images.map((src, i) => (
                <Image key={i} source={{ uri: src }} style={styles.shot} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{passed.sets} × {passed.reps}</Text>
              <Text style={styles.statLabel}>Sets × reps</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{passed.calories_per_set}</Text>
              <Text style={styles.statLabel}>kcal / set</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: DIFF_COLOR[passed.difficulty] || COLORS.white }]}>
                {label(passed.difficulty)}
              </Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>

          <View style={styles.tagRow}>
            <View style={styles.tag}><Text style={styles.tagText}>{label(passed.equipment)}</Text></View>
            {(passed.secondaryMuscles || []).slice(0, 3).map((m) => (
              <View key={m} style={styles.tag}><Text style={styles.tagText}>{label(m)}</Text></View>
            ))}
          </View>

          {steps.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>How to do it</Text>
              <View style={styles.card}>
                {steps.map((s, i) => (
                  <View key={i} style={[styles.step, i === steps.length - 1 && { marginBottom: 0 }]}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                    <Text style={styles.stepText}>{s}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {passed.tips ? (
            <>
              <Text style={styles.sectionTitle}>Coach's tip</Text>
              <View style={[styles.card, styles.tipCard]}>
                <Ionicons name="bulb-outline" size={17} color={COLORS.energy} />
                <Text style={styles.tipText}>{passed.tips}</Text>
              </View>
            </>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── browse view ───────────────────────────────────────────────────────
  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Exercise guide" subtitle="Learn proper form" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railScroll} contentContainerStyle={styles.rail}>
          {muscles.map((m) => {
            const on = selectedMuscle === m.name;
            return (
              <TouchableOpacity
                key={m.name}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => { setSelectedMuscle(m.name); setOpenId(null); }}
                activeOpacity={0.85}
              >
                <Text style={styles.chipIcon}>{iconFor(m.name)}</Text>
                <Text style={[styles.chipText, on && { color: COLORS.onEnergy }]}>{label(m.name)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={COLORS.energy} /></View>
        ) : list.length === 0 ? (
          <View style={styles.card}><Text style={styles.emptyText}>No exercises found.</Text></View>
        ) : (
          list.map((ex) => {
            const open = openId === ex.id;
            return (
              <TouchableOpacity
                key={ex.id}
                style={styles.exCard}
                onPress={() => setOpenId(open ? null : ex.id)}
                activeOpacity={0.85}
              >
                <View style={styles.exTop}>
                  {ex.images?.[0] ? (
                    <Image source={{ uri: ex.images[0] }} style={styles.exThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.exThumb, styles.exThumbFallback]}>
                      <Text style={{ fontSize: 22 }}>{iconFor(ex.muscle)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName} numberOfLines={2}>{ex.name}</Text>
                    <Text style={styles.exMeta}>{ex.sets} × {ex.reps} · {label(ex.equipment)}</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
                </View>

                {open && !!ex.instructions && (
                  <Text style={styles.exBody}>{ex.instructions}</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 12, marginTop: 22 },

  // detail
  shots: { marginHorizontal: -16, marginBottom: 18 },
  shot: { width: 300, height: 200, borderRadius: 20, marginLeft: 16, backgroundColor: COLORS.darkSurface },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1, paddingVertical: 14, borderRadius: 18, alignItems: 'center',
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  statValue: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.extraBold, textTransform: 'capitalize' },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 3 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.darkSurface },
  tagText: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.semiBold },

  card: {
    padding: 16, borderRadius: 18,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  step: { flexDirection: 'row', gap: 11, marginBottom: 13 },
  stepNum: {
    width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.energySoft,
  },
  stepNumText: { fontSize: 11, color: COLORS.energy, ...FONTS.extraBold },
  stepText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 20 },
  tipCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 20 },

  // browse
  railScroll: { marginHorizontal: -16, marginBottom: 20 },
  rail: { paddingHorizontal: 16, gap: 9 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  chipOn: { backgroundColor: COLORS.energy, borderColor: COLORS.energy },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.bold },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, textAlign: 'center' },

  exCard: {
    padding: 11, marginBottom: 10, borderRadius: 18,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exThumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: COLORS.darkSurface },
  exThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  exName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, lineHeight: 19 },
  exMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 3, textTransform: 'capitalize' },
  exBody: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, lineHeight: 20, marginTop: 12 },
});

export default GymExerciseScreen;
