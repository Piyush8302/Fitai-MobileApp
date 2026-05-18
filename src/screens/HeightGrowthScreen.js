import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { HEIGHT_EXERCISES } from '../constants/data';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';

const HeightGrowthScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('exercises');

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Height Growth" subtitle="Posture & Growth Guidance" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Disclaimer */}
        <GradientCard colors={['#FF980020', '#1A1A2E']} style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerTitle}>Scientific Note</Text>
          <Text style={styles.disclaimerText}>
            Height growth primarily depends on genetics and age. After growth plates close (around 18-21 years),
            actual height increase is limited. However, proper posture, nutrition, sleep, and exercise can improve
            your body posture and overall appearance by 1-3 inches.
          </Text>
        </GradientCard>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['exercises', 'nutrition', 'sleep', 'posture'].map((tab) => (
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

        {activeTab === 'exercises' && (
          <>
            <Text style={styles.sectionTitle}>🤸 Stretching Exercises</Text>
            {HEIGHT_EXERCISES.map((ex, i) => (
              <TouchableOpacity key={i} style={styles.exerciseCard}>
                <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.exerciseGrad}>
                  <Text style={styles.exerciseIcon}>{ex.icon}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseDesc}>{ex.desc}</Text>
                  </View>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{ex.duration}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </>
        )}

        {activeTab === 'nutrition' && (
          <>
            <Text style={styles.sectionTitle}>🥗 Height-Supporting Nutrition</Text>
            <GradientCard>
              {[
                { icon: '🥛', title: 'Calcium', desc: 'Milk, cheese, yogurt — for bone strength' },
                { icon: '🥚', title: 'Protein', desc: 'Eggs, chicken, paneer — tissue repair' },
                { icon: '🐟', title: 'Vitamin D', desc: 'Fish, sunlight — calcium absorption' },
                { icon: '🥬', title: 'Zinc', desc: 'Spinach, nuts — growth hormone stimulation' },
                { icon: '🍊', title: 'Vitamin C', desc: 'Oranges, amla — collagen formation' },
                { icon: '🫘', title: 'Iron', desc: 'Beans, lentils — oxygen transport' },
              ].map((n, i) => (
                <View key={i} style={styles.nutriItem}>
                  <Text style={styles.nutriIcon}>{n.icon}</Text>
                  <View style={styles.nutriInfo}>
                    <Text style={styles.nutriTitle}>{n.title}</Text>
                    <Text style={styles.nutriDesc}>{n.desc}</Text>
                  </View>
                </View>
              ))}
            </GradientCard>
          </>
        )}

        {activeTab === 'sleep' && (
          <>
            <Text style={styles.sectionTitle}>😴 Sleep for Growth</Text>
            <GradientCard colors={['#9C27B015', '#1A1A2E']}>
              <Text style={styles.sleepInfo}>Growth Hormone (HGH) is released during deep sleep. Quality sleep is essential for growth.</Text>
              {[
                { icon: '🌙', text: 'Sleep 8-10 hours every night' },
                { icon: '📵', text: 'No screens 1 hour before bed' },
                { icon: '🛏️', text: 'Sleep on a firm mattress' },
                { icon: '🧘', text: 'Practice relaxation before sleep' },
                { icon: '⏰', text: 'Sleep by 10 PM, wake by 6 AM' },
                { icon: '🚫', text: 'Avoid caffeine after 4 PM' },
              ].map((s, i) => (
                <View key={i} style={styles.tipItem}>
                  <Text style={styles.tipIcon}>{s.icon}</Text>
                  <Text style={styles.tipText}>{s.text}</Text>
                </View>
              ))}
            </GradientCard>
          </>
        )}

        {activeTab === 'posture' && (
          <>
            <Text style={styles.sectionTitle}>🧍 Posture Correction</Text>
            <GradientCard colors={['#00D2FF15', '#1A1A2E']}>
              <Text style={styles.sleepInfo}>Good posture can add 1-2 inches to your appearance and prevent back pain.</Text>
              {[
                { icon: '🪑', text: 'Sit straight with shoulders back' },
                { icon: '🚶', text: 'Walk with chin parallel to ground' },
                { icon: '📱', text: 'Avoid text neck — hold phone at eye level' },
                { icon: '🏋️', text: 'Strengthen core and back muscles' },
                { icon: '🧘', text: 'Do yoga for spinal alignment' },
                { icon: '⏱️', text: 'Take breaks every 30 min from sitting' },
              ].map((p, i) => (
                <View key={i} style={styles.tipItem}>
                  <Text style={styles.tipIcon}>{p.icon}</Text>
                  <Text style={styles.tipText}>{p.text}</Text>
                </View>
              ))}
            </GradientCard>
          </>
        )}

        {/* Daily Routine */}
        <Text style={styles.sectionTitle}>📋 Daily Growth Routine</Text>
        <GradientCard>
          {[
            { time: '6:00 AM', activity: 'Wake up + Stretching (15 min)', icon: '🌅' },
            { time: '6:30 AM', activity: 'Hanging Exercise (5 min)', icon: '🧗' },
            { time: '7:00 AM', activity: 'Milk + Eggs Breakfast', icon: '🥛' },
            { time: '10:00 AM', activity: 'Dry Fruits + Water', icon: '🥜' },
            { time: '5:00 PM', activity: 'Swimming / Cycling (30 min)', icon: '🏊' },
            { time: '9:00 PM', activity: 'Yoga + Meditation', icon: '🧘' },
            { time: '10:00 PM', activity: 'Warm Milk + Sleep', icon: '🌙' },
          ].map((r, i) => (
            <View key={i} style={styles.routineItem}>
              <Text style={styles.routineTime}>{r.time}</Text>
              <View style={styles.routineDot} />
              <Text style={styles.routineIcon}>{r.icon}</Text>
              <Text style={styles.routineText}>{r.activity}</Text>
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
  disclaimer: { marginBottom: 20, alignItems: 'center' },
  disclaimerIcon: { fontSize: 28, marginBottom: 8 },
  disclaimerTitle: { fontSize: SIZES.fontLg, color: COLORS.warning, ...FONTS.bold, marginBottom: 8 },
  disclaimerText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, textAlign: 'center', lineHeight: 20 },
  tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusSm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  tabTextActive: { color: COLORS.white, ...FONTS.bold },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  exerciseCard: { marginBottom: 10, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  exerciseGrad: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: SIZES.radius },
  exerciseIcon: { fontSize: 28, marginRight: 14 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  exerciseDesc: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  durationBadge: { backgroundColor: COLORS.accent + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  durationText: { fontSize: SIZES.fontSm, color: COLORS.accent, ...FONTS.bold },
  nutriItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  nutriIcon: { fontSize: 24, marginRight: 14 },
  nutriInfo: { flex: 1 },
  nutriTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  nutriDesc: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  sleepInfo: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 22, marginBottom: 16 },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  tipIcon: { fontSize: 20, marginRight: 12 },
  tipText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },
  routineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  routineTime: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold, width: 64 },
  routineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 10 },
  routineIcon: { fontSize: 20, marginRight: 10 },
  routineText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },
});

export default HeightGrowthScreen;
