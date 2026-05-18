import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import GradientButton from '../components/GradientButton';
import ProgressRing from '../components/ProgressRing';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BMIScreen = ({ navigation }) => {
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.height) setHeight(u.height);
        if (u.weight) setWeight(u.weight);
      }
    })();
  }, []);

  // Save BMI to backend when values change
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await api.post(ENDPOINTS.CALCULATE_BMI, { height, weight, age: 25, gender: 'male' });
        if (res.success) setApiData(res.data);
      } catch (e) { /* offline - use local calc */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [height, weight]);
  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  const bmiPercent = Math.min((bmi / 40) * 100, 100);

  const getBmiCategory = () => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#00D2FF', tip: 'You need to gain some healthy weight' };
    if (bmi < 25) return { label: 'Normal', color: '#4CAF50', tip: 'Great! Maintain your healthy lifestyle' };
    if (bmi < 30) return { label: 'Overweight', color: '#FF9800', tip: 'Consider a calorie deficit plan' };
    return { label: 'Obese', color: '#F44336', tip: 'Consult a doctor and start a fitness plan' };
  };

  const category = getBmiCategory();
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * 25 + 5);
  const dailyCal = Math.round(bmr * 1.55);
  const proteinNeed = Math.round(weight * 1.6);
  const idealMin = (18.5 * ((height / 100) ** 2)).toFixed(1);
  const idealMax = (24.9 * ((height / 100) ** 2)).toFixed(1);
  const bodyFat = (1.2 * bmi + 0.23 * 25 - 5.4).toFixed(1);

  const Slider = ({ value, onChange, min, max, label, unit }) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value} {unit}</Text>
      </View>
      <View style={styles.sliderTrack}>
        <LinearGradient
          colors={COLORS.gradient1}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sliderFill, { width: `${((value - min) / (max - min)) * 100}%` }]}
        />
      </View>
      <View style={styles.sliderBtns}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={styles.sBtn}>
          <Text style={styles.sBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={styles.sBtn}>
          <Text style={styles.sBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="BMI & Body Analysis" onBack={() => navigation.goBack()} rightIcon="information-circle-outline" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Slider value={height} onChange={setHeight} min={100} max={250} label="Height" unit="cm" />
        <Slider value={weight} onChange={setWeight} min={30} max={200} label="Weight" unit="kg" />

        {/* BMI Result */}
        <GradientCard colors={[category.color + '15', COLORS.darkCard]} style={styles.resultCard}>
          <View style={styles.bmiRow}>
            <ProgressRing progress={bmiPercent} size={110} strokeWidth={10} color={category.color} value={bmi} label="BMI" />
            <View style={styles.bmiInfo}>
              <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
                <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
              </View>
              <Text style={styles.bmiTip}>{category.tip}</Text>
            </View>
          </View>

          {/* BMI Scale */}
          <View style={styles.scaleContainer}>
            <View style={styles.scaleBar}>
              {[
                { w: '18.5%', c: '#00D2FF' },
                { w: '25%', c: '#4CAF50' },
                { w: '25%', c: '#FF9800' },
                { w: '31.5%', c: '#F44336' },
              ].map((s, i) => (
                <View key={i} style={[styles.scaleSection, { width: s.w, backgroundColor: s.c }]} />
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>Under</Text>
              <Text style={styles.scaleLabel}>Normal</Text>
              <Text style={styles.scaleLabel}>Over</Text>
              <Text style={styles.scaleLabel}>Obese</Text>
            </View>
          </View>
        </GradientCard>

        {/* Body Stats Grid */}
        <Text style={styles.sectionTitle}>Body Analysis</Text>
        <View style={styles.statsGrid}>
          {[
            { icon: '🔥', label: 'Daily Calories', value: `${dailyCal}`, unit: 'kcal', color: COLORS.secondary },
            { icon: '🥩', label: 'Protein Need', value: `${proteinNeed}`, unit: 'g/day', color: COLORS.primary },
            { icon: '⚡', label: 'BMR', value: `${bmr}`, unit: 'kcal', color: COLORS.warning },
            { icon: '💧', label: 'Body Fat', value: `${bodyFat}`, unit: '%', color: COLORS.accent },
            { icon: '⚖️', label: 'Healthy Range', value: `${idealMin}-${idealMax}`, unit: 'kg', color: COLORS.success },
            { icon: '🎯', label: 'Metabolism', value: bmr > 1600 ? 'High' : 'Normal', unit: '', color: '#9C27B0' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <LinearGradient colors={[s.color + '15', COLORS.darkCard]} style={styles.statGradient}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statUnit}>{s.unit}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* AI Recommendations */}
        <Text style={styles.sectionTitle}>AI Recommendations</Text>
        <GradientCard style={styles.recoCard}>
          {[
            { icon: '🥗', text: 'Maintain a balanced diet with adequate protein intake' },
            { icon: '🏃', text: 'Include 30 min of cardio exercise daily' },
            { icon: '💧', text: 'Drink at least 8 glasses of water daily' },
            { icon: '😴', text: 'Get 7-8 hours of quality sleep' },
          ].map((r, i) => (
            <View key={i} style={styles.recoItem}>
              <Text style={styles.recoIcon}>{r.icon}</Text>
              <Text style={styles.recoText}>{r.text}</Text>
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
  sliderContainer: { marginBottom: 20 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sliderLabel: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium },
  sliderValue: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },
  sliderTrack: { height: 8, backgroundColor: COLORS.darkBorder, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  sliderFill: { height: '100%', borderRadius: 4 },
  sliderBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  sBtn: {
    width: 44, height: 36, borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  sBtnText: { fontSize: 20, color: COLORS.primary, ...FONTS.bold },
  resultCard: { marginBottom: 24 },
  bmiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  bmiInfo: { flex: 1, marginLeft: 20 },
  categoryBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 10 },
  categoryText: { fontSize: SIZES.fontMd, ...FONTS.bold },
  bmiTip: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 20 },
  scaleContainer: { marginTop: 8 },
  scaleBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  scaleSection: { height: '100%' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    width: '48%', borderRadius: SIZES.radius, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  statGradient: { padding: 14, alignItems: 'center', borderRadius: SIZES.radius },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 4 },
  statValue: { fontSize: SIZES.fontXl, ...FONTS.bold },
  statUnit: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  recoCard: {},
  recoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  recoIcon: { fontSize: 22, marginRight: 12 },
  recoText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, flex: 1, lineHeight: 20 },
});

export default BMIScreen;
