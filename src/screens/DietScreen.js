import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { MEAL_PLAN_SAMPLE } from '../constants/data';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import ProgressRing from '../components/ProgressRing';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Diet-specific meal suggestions based on preference
const DIET_MEALS = {
  veg: {
    breakfast: [
      { name: 'Oats with Banana & Almonds', calories: 320, protein: 12, carbs: 55, fat: 8, icon: '🍲' },
      { name: 'Poha with Peanuts', calories: 280, protein: 8, carbs: 45, fat: 8, icon: '🍚' },
      { name: 'Idli with Sambar (4 pcs)', calories: 250, protein: 10, carbs: 42, fat: 4, icon: '🥘' },
      { name: 'Moong Dal Chilla + Curd', calories: 270, protein: 16, carbs: 30, fat: 6, icon: '🫓' },
    ],
    lunch: [
      { name: 'Dal Rice + Sabzi + Salad', calories: 450, protein: 18, carbs: 65, fat: 10, icon: '🍛' },
      { name: 'Paneer Tikka + 2 Roti', calories: 480, protein: 24, carbs: 45, fat: 18, icon: '🧀' },
      { name: 'Rajma Chawal + Raita', calories: 420, protein: 16, carbs: 62, fat: 8, icon: '🍛' },
      { name: 'Chole + 2 Roti + Salad', calories: 440, protein: 17, carbs: 58, fat: 12, icon: '🥗' },
    ],
    dinner: [
      { name: 'Chapati + Dal Fry + Sabzi', calories: 380, protein: 15, carbs: 52, fat: 8, icon: '🫓' },
      { name: 'Mixed Veg Curry + Rice', calories: 400, protein: 12, carbs: 58, fat: 10, icon: '🥘' },
      { name: 'Palak Paneer + 2 Roti', calories: 420, protein: 20, carbs: 40, fat: 16, icon: '🥬' },
      { name: 'Khichdi + Kadhi', calories: 350, protein: 14, carbs: 50, fat: 6, icon: '🍚' },
    ],
    snacks: [
      { name: 'Mixed Nuts (30g)', calories: 180, protein: 5, carbs: 6, fat: 16, icon: '🥜' },
      { name: 'Fruit Bowl', calories: 150, protein: 2, carbs: 35, fat: 1, icon: '🍎' },
      { name: 'Sprouts Chaat', calories: 160, protein: 10, carbs: 22, fat: 3, icon: '🥗' },
      { name: 'Roasted Makhana', calories: 100, protein: 3, carbs: 18, fat: 1, icon: '🌰' },
    ],
  },
  non_veg: {
    breakfast: [
      { name: 'Egg Omelette (3) + Toast', calories: 380, protein: 24, carbs: 30, fat: 16, icon: '🍳' },
      { name: 'Boiled Eggs (3) + Banana', calories: 330, protein: 20, carbs: 28, fat: 14, icon: '🥚' },
      { name: 'Oats + Protein Shake', calories: 350, protein: 30, carbs: 40, fat: 6, icon: '🍲' },
      { name: 'Chicken Sandwich', calories: 370, protein: 26, carbs: 35, fat: 12, icon: '🥪' },
    ],
    lunch: [
      { name: 'Chicken Curry + 2 Roti', calories: 520, protein: 35, carbs: 45, fat: 16, icon: '🍗' },
      { name: 'Fish Curry + Rice + Salad', calories: 480, protein: 30, carbs: 55, fat: 12, icon: '🐟' },
      { name: 'Egg Bhurji + 3 Roti', calories: 460, protein: 22, carbs: 50, fat: 14, icon: '🍳' },
      { name: 'Chicken Biryani + Raita', calories: 550, protein: 28, carbs: 65, fat: 16, icon: '🍛' },
    ],
    dinner: [
      { name: 'Grilled Chicken + Salad', calories: 350, protein: 35, carbs: 15, fat: 12, icon: '🥗' },
      { name: 'Fish Tikka + 1 Roti', calories: 320, protein: 30, carbs: 25, fat: 10, icon: '🐟' },
      { name: 'Egg Curry + Rice (small)', calories: 400, protein: 18, carbs: 45, fat: 14, icon: '🍛' },
      { name: 'Tandoori Chicken + Salad', calories: 300, protein: 32, carbs: 10, fat: 10, icon: '🍗' },
    ],
    snacks: [
      { name: 'Protein Shake', calories: 180, protein: 25, carbs: 12, fat: 3, icon: '🥤' },
      { name: 'Boiled Eggs (2)', calories: 155, protein: 13, carbs: 1, fat: 11, icon: '🥚' },
      { name: 'Greek Yogurt + Nuts', calories: 200, protein: 14, carbs: 10, fat: 12, icon: '🥛' },
      { name: 'Chicken Tikka (5 pcs)', calories: 180, protein: 22, carbs: 4, fat: 8, icon: '🍢' },
    ],
  },
  vegan: {
    breakfast: [
      { name: 'Smoothie Bowl (Banana+Oats)', calories: 300, protein: 8, carbs: 55, fat: 6, icon: '🍲' },
      { name: 'Poha + Soy Milk', calories: 280, protein: 10, carbs: 44, fat: 7, icon: '🍚' },
      { name: 'Ragi Dosa + Chutney', calories: 240, protein: 6, carbs: 40, fat: 5, icon: '🫓' },
      { name: 'Tofu Scramble + Toast', calories: 320, protein: 18, carbs: 30, fat: 12, icon: '🍞' },
    ],
    lunch: [
      { name: 'Dal Rice + Sabzi', calories: 420, protein: 16, carbs: 60, fat: 8, icon: '🍛' },
      { name: 'Tofu Curry + 2 Roti', calories: 400, protein: 20, carbs: 42, fat: 14, icon: '🥘' },
      { name: 'Chole + Brown Rice', calories: 450, protein: 18, carbs: 58, fat: 10, icon: '🍛' },
      { name: 'Soya Chunk Curry + Roti', calories: 440, protein: 28, carbs: 45, fat: 12, icon: '🍛' },
    ],
    dinner: [
      { name: 'Mixed Veg + Chapati', calories: 350, protein: 10, carbs: 50, fat: 8, icon: '🥘' },
      { name: 'Quinoa Salad Bowl', calories: 380, protein: 14, carbs: 48, fat: 10, icon: '🥗' },
      { name: 'Tofu Stir Fry + Rice', calories: 400, protein: 18, carbs: 52, fat: 12, icon: '🍚' },
      { name: 'Masoor Dal + 2 Roti', calories: 360, protein: 15, carbs: 48, fat: 6, icon: '🫓' },
    ],
    snacks: [
      { name: 'Mixed Nuts & Seeds', calories: 200, protein: 6, carbs: 8, fat: 18, icon: '🥜' },
      { name: 'Roasted Chana', calories: 140, protein: 8, carbs: 22, fat: 3, icon: '🌰' },
      { name: 'Fruit + Peanut Butter', calories: 220, protein: 6, carbs: 28, fat: 10, icon: '🍎' },
      { name: 'Soy Protein Shake', calories: 160, protein: 20, carbs: 12, fat: 2, icon: '🥤' },
    ],
  },
  eggetarian: {
    breakfast: [
      { name: 'Egg Omelette + 2 Toast', calories: 350, protein: 22, carbs: 32, fat: 14, icon: '🍳' },
      { name: 'Boiled Eggs (2) + Oats', calories: 330, protein: 20, carbs: 35, fat: 12, icon: '🥚' },
      { name: 'Egg Bhurji + Paratha', calories: 400, protein: 18, carbs: 40, fat: 16, icon: '🍳' },
      { name: 'French Toast (2) + Banana', calories: 360, protein: 14, carbs: 48, fat: 10, icon: '🍞' },
    ],
    lunch: [
      { name: 'Egg Curry + Rice + Salad', calories: 450, protein: 20, carbs: 55, fat: 14, icon: '🍛' },
      { name: 'Paneer Tikka + 2 Roti', calories: 480, protein: 24, carbs: 45, fat: 18, icon: '🧀' },
      { name: 'Dal Fry + Rice + Egg', calories: 460, protein: 22, carbs: 58, fat: 12, icon: '🍚' },
      { name: 'Rajma + Roti + Boiled Egg', calories: 440, protein: 20, carbs: 52, fat: 12, icon: '🍛' },
    ],
    dinner: [
      { name: 'Egg Fried Rice + Raita', calories: 400, protein: 16, carbs: 52, fat: 12, icon: '🍚' },
      { name: 'Palak Paneer + Roti', calories: 380, protein: 18, carbs: 38, fat: 14, icon: '🥬' },
      { name: 'Omelette + Chapati + Sabzi', calories: 360, protein: 20, carbs: 35, fat: 12, icon: '🍳' },
      { name: 'Mixed Veg + Rice (light)', calories: 340, protein: 10, carbs: 50, fat: 8, icon: '🥘' },
    ],
    snacks: [
      { name: 'Boiled Eggs (2)', calories: 155, protein: 13, carbs: 1, fat: 11, icon: '🥚' },
      { name: 'Fruit Bowl', calories: 150, protein: 2, carbs: 35, fat: 1, icon: '🍎' },
      { name: 'Paneer Tikka (4 pcs)', calories: 180, protein: 12, carbs: 4, fat: 14, icon: '🧀' },
      { name: 'Mixed Nuts', calories: 200, protein: 6, carbs: 8, fat: 18, icon: '🥜' },
    ],
  },
};

// Goal-based calorie adjustments
const GOAL_ADJUSTMENTS = {
  weight_loss: { calMult: 0.8, desc: 'BMR-based deficit', tip: 'Your target is your BMR — the minimum your body needs. This creates a safe calorie deficit for fat loss while protecting health.' },
  fat_loss: { calMult: 0.8, desc: 'BMR-based deficit', tip: 'Target your BMR calories. High protein, moderate carbs, include cardio for maximum fat burn.' },
  weight_gain: { calMult: 1.2, desc: 'Calorie surplus for weight gain', tip: 'Eat 20% more than your TDEE. Focus on clean calories.' },
  muscle_building: { calMult: 1.15, desc: 'Slight surplus for muscle growth', tip: 'High protein (1.6-2g/kg), moderate surplus, strength training.' },
  maintenance: { calMult: 1.0, desc: 'Maintain current weight', tip: 'Eat at your TDEE. Balance all macros equally.' },
  height_growth: { calMult: 1.1, desc: 'Nutritious surplus for growth', tip: 'Calcium-rich foods, adequate protein, Vitamin D, good sleep.' },
  home_workout: { calMult: 1.0, desc: 'Balanced nutrition', tip: 'Clean eating with enough protein for recovery.' },
  gym_workout: { calMult: 1.1, desc: 'Fueling gym performance', tip: 'Pre & post workout nutrition, creatine, BCAAs.' },
};

const DietScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dietType, setDietType] = useState('balanced');

  const loadDietData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const [profileRes, trackRes] = await Promise.all([
        api.get(ENDPOINTS.GET_ME),
        api.get(ENDPOINTS.TODAY_TRACKING),
      ]);
      if (profileRes.success) {
        const u = profileRes.data || profileRes.user;
        setUser(u);
        if (u.fitnessGoal === 'weight_loss' || u.fitnessGoal === 'fat_loss') setDietType('deficit');
        else if (u.fitnessGoal === 'weight_gain' || u.fitnessGoal === 'muscle_building') setDietType('surplus');
        else setDietType('balanced');
      }
      if (trackRes.success) setTracking(trackRes.data);
    } catch (e) { console.log(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadDietData(); }, [loadDietData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDietData();
    });
    return unsubscribe;
  }, [navigation, loadDietData]);

  if (loading) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  // Calculate personalized values from profile
  const dailyCal = user?.dailyCalories || 2000;
  const bmr = user?.bmr || Math.round(dailyCal / 1.55);
  const goal = user?.fitnessGoal || 'maintenance';
  const adjustment = GOAL_ADJUSTMENTS[goal] || GOAL_ADJUSTMENTS.maintenance;
  const isWeightLoss = goal === 'weight_loss' || goal === 'fat_loss';
  const targetCal = isWeightLoss ? bmr : Math.round(dailyCal * adjustment.calMult);
  const proteinNeed = user?.proteinNeed || Math.round((user?.weight || 70) * 1.6);
  const carbsNeed = Math.round((targetCal * 0.45) / 4); // 45% carbs
  const fatNeed = Math.round((targetCal * 0.25) / 9); // 25% fat

  const consumed = tracking?.caloriesConsumed || 0;
  const proteinConsumed = tracking?.proteinConsumed || 0;
  const carbsConsumed = tracking?.carbsConsumed || 0;
  const fatConsumed = tracking?.fatConsumed || 0;

  // Get meals based on diet preference
  const preference = user?.dietPreference || 'veg';
  const meals = DIET_MEALS[preference] || DIET_MEALS.veg;

  // Meal selection based on active diet strategy (dietType), not just goal
  const getMealsForType = (type) => {
    const options = [...(meals[type] || [])];
    if (dietType === 'deficit') {
      return options.sort((a, b) => a.calories - b.calories).slice(0, 2);
    } else if (dietType === 'surplus') {
      return options.sort((a, b) => b.calories - a.calories).slice(0, 2);
    } else if (dietType === 'highprotein') {
      return options.sort((a, b) => b.protein - a.protein).slice(0, 2);
    }
    return options.slice(0, 2);
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="AI Diet Manager" subtitle="Personalized for You" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ===== PROFILE-BASED RECOMMENDATION BANNER ===== */}
        <GradientCard colors={[COLORS.primary + '15', '#1A1A2E']} style={styles.recBanner}>
          <View style={styles.recHeader}>
            <View style={[styles.recIconWrap, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="sparkles" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recTitle}>Personalized for {user?.name || 'You'}</Text>
              <Text style={styles.recDesc}>
                {user?.gender ? `${user.gender}, ` : ''}{user?.weight || '--'}kg, {user?.height || '--'}cm • {(goal || '').replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          <View style={styles.recTipBox}>
            <Ionicons name="bulb-outline" size={16} color={COLORS.warning} />
            <Text style={styles.recTip}>{adjustment.tip}</Text>
          </View>
        </GradientCard>

        {/* ===== CALORIE SUMMARY ===== */}
        <GradientCard colors={['#4CAF5015', '#1A1A2E']} style={styles.calorieCard}>
          <View style={styles.calRow}>
            <ProgressRing
              progress={targetCal > 0 ? Math.min(100, Math.round((consumed / targetCal) * 100)) : 0}
              size={100}
              strokeWidth={10}
              color={consumed > targetCal ? COLORS.secondary : COLORS.success}
              value={`${consumed}`}
              label="kcal eaten"
            />
            <View style={styles.calInfo}>
              <View style={styles.calItem}>
                <View style={[styles.calDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.calLabel}>Consumed</Text>
                <Text style={styles.calValue}>{consumed} kcal</Text>
              </View>
              <View style={styles.calItem}>
                <View style={[styles.calDot, { backgroundColor: COLORS.secondary }]} />
                <Text style={styles.calLabel}>Remaining</Text>
                <Text style={styles.calValue}>{Math.max(0, targetCal - consumed)} kcal</Text>
              </View>
              <View style={styles.calItem}>
                <View style={[styles.calDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.calLabel}>Target ({adjustment.desc})</Text>
                <Text style={styles.calValue}>{targetCal} kcal</Text>
              </View>
            </View>
          </View>

          {/* Macro Progress */}
          <View style={styles.macroRow}>
            {[
              { name: 'Protein', current: proteinConsumed, target: proteinNeed, color: COLORS.primary, unit: 'g' },
              { name: 'Carbs', current: carbsConsumed, target: carbsNeed, color: COLORS.warning, unit: 'g' },
              { name: 'Fat', current: fatConsumed, target: fatNeed, color: COLORS.secondary, unit: 'g' },
            ].map((m, i) => (
              <View key={i} style={styles.macroItem}>
                <View style={styles.macroLabelRow}>
                  <Text style={styles.macroLabel}>{m.name}</Text>
                  <Text style={[styles.macroValue, { color: m.color }]}>{m.current}/{m.target}{m.unit}</Text>
                </View>
                <View style={styles.macroBar}>
                  <View style={[styles.macroFill, {
                    width: `${Math.min(100, m.target > 0 ? (m.current / m.target) * 100 : 0)}%`,
                    backgroundColor: m.color,
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </GradientCard>

        {/* ===== YOUR DIET PROFILE ===== */}
        <Text style={styles.sectionTitle}>👤 Your Diet Profile</Text>
        <View style={styles.profileCards}>
          {[
            { icon: '⚖️', label: 'BMI', value: `${user?.bmi || '--'}`, color: COLORS.accent },
            { icon: '🔥', label: 'BMR', value: `${bmr}`, color: COLORS.secondary },
            { icon: '🎯', label: isWeightLoss ? 'Target' : 'TDEE', value: `${targetCal}`, color: COLORS.primary },
            { icon: '🥗', label: 'Diet', value: (preference || 'veg').replace(/_/g, ' '), color: COLORS.success },
          ].map((p, i) => (
            <View key={i} style={[styles.profileCard, { borderColor: p.color + '30' }]}>
              <Text style={styles.profileCardIcon}>{p.icon}</Text>
              <Text style={[styles.profileCardValue, { color: p.color }]}>{p.value}</Text>
              <Text style={styles.profileCardLabel}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* ===== DIET TYPE SELECTOR ===== */}
        <Text style={styles.sectionTitle}>🥗 Diet Strategy</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dietScroll}>
          {[
            { id: 'balanced', name: 'Balanced', icon: '⚖️' },
            { id: 'deficit', name: 'Fat Loss', icon: '🔥' },
            { id: 'surplus', name: 'Mass Gain', icon: '💪' },
            { id: 'highprotein', name: 'High Protein', icon: '🥩' },
            { id: 'intermittent', name: 'IF 16:8', icon: '⏰' },
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

        {/* ===== SUGGESTED MEAL PLAN ===== */}
        <Text style={styles.sectionTitle}>
          📋 Suggested Meals ({(preference || 'veg').replace(/_/g, ' ')})
        </Text>
        <Text style={styles.mealSubtitle}>
          {dietType === 'deficit'
            ? '🔥 Lower calorie options prioritized'
            : dietType === 'surplus'
            ? '💪 Higher calorie options for mass gain'
            : dietType === 'highprotein'
            ? '🥩 Highest protein options prioritized'
            : dietType === 'intermittent'
            ? '⏰ Meals within 8-hour eating window'
            : '⚖️ Balanced nutrition options'}
        </Text>

        {Object.entries(meals).map(([mealType, mealList]) => (
          <View key={mealType} style={styles.mealSection}>
            <Text style={styles.mealType}>
              {mealType === 'breakfast' ? '🌅 Breakfast' :
               mealType === 'lunch' ? '☀️ Lunch' :
               mealType === 'dinner' ? '🌙 Dinner' : '🍪 Snacks'}
            </Text>
            {getMealsForType(mealType).map((meal, i) => (
              <TouchableOpacity
                key={i}
                style={styles.mealCard}
                onPress={() => {
                  Alert.alert(
                    meal.name,
                    `Calories: ${meal.calories} kcal\nProtein: ${meal.protein}g\nCarbs: ${meal.carbs}g\nFat: ${meal.fat}g\n\nLog this to today's meals?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Log Meal',
                        onPress: async () => {
                          try {
                            const res = await api.post(ENDPOINTS.LOG_MEAL, {
                              mealType: mealType === 'snacks' ? 'snack' : mealType,
                              items: [{ name: meal.name, calories: meal.calories, protein: meal.protein }],
                              totalCalories: meal.calories,
                            });
                            if (res.success) {
                              setTracking(res.data);
                              Alert.alert('Logged!', `${meal.name} added to your daily log`);
                            }
                          } catch (e) { Alert.alert('Error', 'Failed to log meal'); }
                        },
                      },
                    ]
                  );
                }}
              >
                <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.mealGrad}>
                  <Text style={styles.mealIcon}>{meal.icon}</Text>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <View style={styles.mealNutrients}>
                      <Text style={[styles.nutrient, { color: COLORS.accent }]}>P:{meal.protein}g</Text>
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

        {/* ===== WATER TRACKER ===== */}
        <Text style={styles.sectionTitle}>💧 Water Intake</Text>
        <GradientCard colors={['#00D2FF15', '#1A1A2E']}>
          <View style={styles.waterRow}>
            <ProgressRing
              progress={Math.min(100, ((tracking?.waterIntake || 0) / 8) * 100)}
              size={80}
              color={COLORS.accent}
              value={`${tracking?.waterIntake || 0}`}
              label="of 8"
            />
            <View style={styles.waterGlasses}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.glass, g <= (tracking?.waterIntake || 0) && styles.glassFilled]}
                  onPress={async () => {
                    try {
                      const res = await api.post(ENDPOINTS.ADD_WATER, { glasses: 1 });
                      if (res.success) {
                        setTracking(prev => ({ ...prev, waterIntake: res.data.waterIntake }));
                      }
                    } catch (e) { console.log(e); }
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{g <= (tracking?.waterIntake || 0) ? '💧' : '🔲'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.waterTip}>Tap to log water • Goal: 8 glasses (2L)</Text>
        </GradientCard>

        {/* ===== DIET TIPS BASED ON GOAL ===== */}
        <Text style={styles.sectionTitle}>💡 Tips for {(goal || '').replace(/_/g, ' ')}</Text>
        <GradientCard colors={[COLORS.warning + '10', '#1A1A2E']}>
          {(() => {
            const tips = {
              weight_loss: [
                'Drink water 30 min before meals to reduce appetite',
                'Eat more protein to stay fuller longer',
                'Avoid sugary drinks - they add hidden calories',
                'Eat slowly and mindfully, chew 20+ times',
              ],
              fat_loss: [
                'Focus on high protein, moderate carbs, low fat',
                'Include HIIT cardio 3-4 times per week',
                'Avoid eating late at night after 8 PM',
                'Track every meal to stay in calorie deficit',
              ],
              weight_gain: [
                'Eat every 2-3 hours, never skip meals',
                'Add healthy fats: ghee, nuts, peanut butter',
                'Drink milk/lassi with meals for extra calories',
                'Focus on compound exercises in the gym',
              ],
              muscle_building: [
                'Eat 1.6-2g protein per kg of body weight',
                'Have protein within 30 min post-workout',
                'Include dal, paneer, eggs, chicken in every meal',
                'Sleep 7-8 hours for muscle recovery',
              ],
            };
            const goalTips = tips[goal] || tips.weight_loss;
            return goalTips.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ));
          })()}
        </GradientCard>

        {/* Browse Food DB link */}
        <TouchableOpacity
          style={styles.foodDbBtn}
          onPress={() => navigation.navigate('FoodDatabase')}
        >
          <LinearGradient colors={COLORS.gradient1} style={styles.foodDbBtnGrad}>
            <Ionicons name="search" size={20} color={COLORS.white} />
            <Text style={styles.foodDbBtnText}>Browse Food Database</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  // Recommendation Banner
  recBanner: { marginBottom: 16 },
  recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  recIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  recTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  recDesc: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2, textTransform: 'capitalize' },
  recTipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.warning + '10', borderRadius: 8, padding: 10 },
  recTip: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, flex: 1, lineHeight: 20 },

  // Calorie Summary
  calorieCard: { marginBottom: 20 },
  calRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  calInfo: { flex: 1, marginLeft: 20 },
  calItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  calDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  calLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, flex: 1 },
  calValue: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold },
  macroRow: { gap: 10 },
  macroItem: { marginBottom: 8 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  macroBar: { height: 6, backgroundColor: COLORS.darkBorder, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
  macroValue: { fontSize: SIZES.fontXs, ...FONTS.bold },

  // Profile Cards
  profileCards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  profileCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1,
  },
  profileCardIcon: { fontSize: 22, marginBottom: 4 },
  profileCardValue: { fontSize: SIZES.fontMd, ...FONTS.bold, textTransform: 'capitalize' },
  profileCardLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  // Section
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  mealSubtitle: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 14, marginTop: -8 },

  // Diet Type
  dietScroll: { marginBottom: 24 },
  dietChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: 24, marginRight: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  dietChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  dietChipIcon: { fontSize: 18, marginRight: 6 },
  dietChipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },

  // Meal Plan
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

  // Water
  waterRow: { flexDirection: 'row', alignItems: 'center' },
  waterGlasses: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', marginLeft: 16, gap: 8 },
  glass: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.darkBorder + '40' },
  glassFilled: { backgroundColor: COLORS.accent + '20' },
  waterTip: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 12 },

  // Tips
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tipBullet: { fontSize: SIZES.fontMd, color: COLORS.warning, marginRight: 10, marginTop: 2 },
  tipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, flex: 1, lineHeight: 20 },

  // Food DB Button
  foodDbBtn: { borderRadius: SIZES.radius, overflow: 'hidden', marginTop: 8 },
  foodDbBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderRadius: SIZES.radius },
  foodDbBtnText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
});

export default DietScreen;
