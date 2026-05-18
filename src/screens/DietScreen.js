import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { MEAL_PLAN_SAMPLE } from '../constants/data';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import ProgressRing from '../components/ProgressRing';

const { width } = Dimensions.get('window');

const DietScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('plan');
  const [dietType, setDietType] = useState('balanced');

  const totalCal = 2100;
  const consumed = 1450;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="AI Diet Manager" subtitle="Personalized Nutrition" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Calorie Summary */}
        <GradientCard colors={['#4CAF5015', '#1A1A2E']} style={styles.calorieCard}>
          <View style={styles.calRow}>
            <ProgressRing progress={(consumed / totalCal) * 100} size={100} strokeWidth={10} color={COLORS.success} value={`${consumed}`} label="kcal eaten" />
            <View style={styles.calInfo}>
              <View style={styles.calItem}>
                <View style={[styles.calDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.calLabel}>Consumed</Text>
                <Text style={styles.calValue}>{consumed} kcal</Text>
              </View>
              <View style={styles.calItem}>
                <View style={[styles.calDot, { backgroundColor: COLORS.secondary }]} />
                <Text style={styles.calLabel}>Remaining</Text>
                <Text style={styles.calValue}>{totalCal - consumed} kcal</Text>
              </View>
              <View style={styles.calItem}>
                <View style={[styles.calDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.calLabel}>Target</Text>
                <Text style={styles.calValue}>{totalCal} kcal</Text>
              </View>
            </View>
          </View>

          {/* Macro Progress */}
          <View style={styles.macroRow}>
            {[
              { name: 'Protein', current: 85, target: 120, color: COLORS.primary, unit: 'g' },
              { name: 'Carbs', current: 180, target: 250, color: COLORS.warning, unit: 'g' },
              { name: 'Fat', current: 40, target: 65, color: COLORS.secondary, unit: 'g' },
            ].map((m, i) => (
              <View key={i} style={styles.macroItem}>
                <Text style={styles.macroLabel}>{m.name}</Text>
                <View style={styles.macroBar}>
                  <View style={[styles.macroFill, { width: `${(m.current / m.target) * 100}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={[styles.macroValue, { color: m.color }]}>{m.current}/{m.target}{m.unit}</Text>
              </View>
            ))}
          </View>
        </GradientCard>

        {/* Diet Type Selection */}
        <Text style={styles.sectionTitle}>🥗 Diet Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dietScroll}>
          {[
            { id: 'balanced', name: 'Balanced', icon: '⚖️' },
            { id: 'highprotein', name: 'High Protein', icon: '🥩' },
            { id: 'keto', name: 'Keto', icon: '🥑' },
            { id: 'intermittent', name: 'IF 16:8', icon: '⏰' },
            { id: 'veg', name: 'Vegetarian', icon: '🥬' },
          ].map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.dietChip, dietType === d.id && styles.dietChipActive]}
              onPress={() => setDietType(d.id)}
            >
              <Text style={styles.dietChipIcon}>{d.icon}</Text>
              <Text style={[styles.dietChipText, dietType === d.id && { color: COLORS.primary }]}>{d.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Meal Plan */}
        <Text style={styles.sectionTitle}>📋 Today's Meal Plan</Text>
        {Object.entries(MEAL_PLAN_SAMPLE).map(([mealType, meals]) => (
          <View key={mealType} style={styles.mealSection}>
            <Text style={styles.mealType}>
              {mealType === 'breakfast' ? '🌅 Breakfast' :
               mealType === 'lunch' ? '☀️ Lunch' :
               mealType === 'dinner' ? '🌙 Dinner' : '🍪 Snacks'}
            </Text>
            {meals.slice(0, 2).map((meal, i) => (
              <TouchableOpacity key={i} style={styles.mealCard}>
                <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.mealGrad}>
                  <Text style={styles.mealIcon}>{meal.icon}</Text>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <View style={styles.mealNutrients}>
                      <Text style={[styles.nutrient, { color: COLORS.success }]}>P:{meal.protein}g</Text>
                      <Text style={[styles.nutrient, { color: COLORS.warning }]}>C:{meal.carbs}g</Text>
                      <Text style={[styles.nutrient, { color: COLORS.secondary }]}>F:{meal.fat}g</Text>
                    </View>
                  </View>
                  <View style={styles.mealCalBadge}>
                    <Text style={styles.mealCalText}>{meal.calories}</Text>
                    <Text style={styles.mealCalUnit}>kcal</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Water Tracker */}
        <Text style={styles.sectionTitle}>💧 Water Intake</Text>
        <GradientCard colors={['#00D2FF15', '#1A1A2E']}>
          <View style={styles.waterRow}>
            <ProgressRing progress={75} size={80} color={COLORS.accent} value="6" label="of 8" />
            <View style={styles.waterGlasses}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                <TouchableOpacity key={g} style={[styles.glass, g <= 6 && styles.glassFilled]}>
                  <Text style={{ fontSize: 18 }}>{g <= 6 ? '💧' : '🔲'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.waterTip}>Tap to log water • Goal: 8 glasses (2L)</Text>
        </GradientCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  calorieCard: { marginBottom: 24 },
  calRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  calInfo: { flex: 1, marginLeft: 20 },
  calItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  calDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  calLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, flex: 1 },
  calValue: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold },
  macroRow: { gap: 10 },
  macroItem: { marginBottom: 8 },
  macroLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 4 },
  macroBar: { height: 6, backgroundColor: COLORS.darkBorder, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  macroFill: { height: '100%', borderRadius: 3 },
  macroValue: { fontSize: SIZES.fontXs, ...FONTS.bold },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  dietScroll: { marginBottom: 24 },
  dietChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: 24, marginRight: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  dietChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  dietChipIcon: { fontSize: 18, marginRight: 6 },
  dietChipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  mealSection: { marginBottom: 20 },
  mealType: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.semiBold, marginBottom: 10 },
  mealCard: { marginBottom: 8, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  mealGrad: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: SIZES.radius },
  mealIcon: { fontSize: 28, marginRight: 12 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  mealNutrients: { flexDirection: 'row', gap: 10, marginTop: 4 },
  nutrient: { fontSize: SIZES.fontXs, ...FONTS.bold },
  mealCalBadge: { alignItems: 'center' },
  mealCalText: { fontSize: SIZES.fontLg, color: COLORS.primary, ...FONTS.bold },
  mealCalUnit: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  waterRow: { flexDirection: 'row', alignItems: 'center' },
  waterGlasses: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', marginLeft: 16, gap: 8 },
  glass: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.darkBorder + '40' },
  glassFilled: { backgroundColor: COLORS.accent + '20' },
  waterTip: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 12 },
});

export default DietScreen;
