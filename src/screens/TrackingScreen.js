import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Modal, TextInput, Platform, Animated, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import ProgressRing from '../components/ProgressRing';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISES, WORKOUT_CATEGORIES, MEAL_PLAN_SAMPLE, DIET_MEAL_SUGGESTIONS } from '../constants/data';

const { width } = Dimensions.get('window');

const TrackingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [tracking, setTracking] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showWalkModal, setShowWalkModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Walk/Activity form
  const [walkKm, setWalkKm] = useState('');
  const [walkMin, setWalkMin] = useState('');
  const [activityType, setActivityType] = useState('walk');

  // Auto-detect meal type from current time
  const getMealTypeByTime = () => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) return 'breakfast';   // 4 AM – 11 AM
    if (h >= 11 && h < 16) return 'lunch';      // 11 AM – 4 PM
    if (h >= 16 && h < 19) return 'snack';      // 4 PM – 7 PM
    return 'dinner';                            // 7 PM – 4 AM
  };

  // Meal form
  const [mealType, setMealType] = useState(getMealTypeByTime());
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [foodResults, setFoodResults] = useState([]);
  const [foodSearching, setFoodSearching] = useState(false);
  const foodSearchTimer = useRef(null);

  // Sleep form
  const [sleepHours, setSleepHours] = useState('7');

  // Exercise form
  const [selectedExCategory, setSelectedExCategory] = useState('chest');
  const [selectedExercises, setSelectedExercises] = useState([]);

  // Weight form
  const [weightInput, setWeightInput] = useState('');

  // Calorie info modal (BMR/TDEE/Target explanation)
  const [showCalorieInfo, setShowCalorieInfo] = useState(false);

  // Weekly data
  const [weeklyData, setWeeklyData] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef(null);

  const showToast = (icon, title, msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ icon, title, msg });
    toastAnim.setValue(-100);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 2500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);

      const [trackRes, profileRes] = await Promise.all([
        api.get(ENDPOINTS.TODAY_TRACKING),
        api.get(ENDPOINTS.GET_ME),
      ]);

      if (trackRes.success) setTracking(trackRes.data);
      if (profileRes.success) setUserProfile(profileRes.data || profileRes.user);
    } catch (e) {
      console.log('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeekly = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.WEEKLY_REPORT);
      if (res.success) setWeeklyData(res.data);
    } catch (e) { console.log(e); }
  }, []);

  useEffect(() => {
    loadData();
    loadWeekly();
  }, [loadData, loadWeekly]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
      loadWeekly();
    });
    return unsubscribe;
  }, [navigation, loadData, loadWeekly]);

  // ===== API ACTIONS =====
  const MAX_WATER = 20;

  const addWater = async (delta = 1) => {
    const current = tracking?.waterIntake || 0;
    if (delta < 0 && current <= 0) return; // can't go below 0
    if (delta > 0 && current >= MAX_WATER) return; // cap at 20 glasses

    // Optimistic update — instant UI feedback
    setTracking(prev => ({
      ...prev,
      waterIntake: Math.min(MAX_WATER, Math.max(0, (prev?.waterIntake || 0) + delta)),
    }));

    try {
      const res = await api.post(ENDPOINTS.ADD_WATER, { glasses: delta });
      if (res.success) {
        setTracking(prev => ({
          ...prev,
          waterIntake: res.data.waterIntake,
        }));
      }
    } catch (e) {
      // Revert on failure
      setTracking(prev => ({
        ...prev,
        waterIntake: current,
      }));
      console.log('Water error:', e);
    }
  };

  const logMood = async (selectedMood) => {
    try {
      const res = await api.post(ENDPOINTS.LOG_TRACKING, { mood: selectedMood });
      if (res.success) setTracking(prev => ({ ...prev, mood: selectedMood }));
    } catch (e) { console.log('Mood error:', e); }
  };

  const logWalkActivity = async () => {
    const km = parseFloat(walkKm);
    const min = parseInt(walkMin) || 0;
    if (!km || km <= 0) { Alert.alert('Error', 'Enter valid distance'); return; }

    // Weight-based calorie burn (MET research: ACSM & ICMR guidelines)
    const userWeight = userProfile?.weight || 60;
    const caloriesPerKm = activityType === 'run'
      ? Math.round(userWeight * 1.03)     // MET ~8-10, ~1.03 kcal/kg/km
      : activityType === 'cycle'
        ? Math.round(userWeight * 0.45)    // MET ~6, ~0.45 kcal/kg/km
        : Math.round(userWeight * 0.72);   // Walking MET ~3.5, ~0.72 kcal/kg/km
    const calBurned = Math.round(km * caloriesPerKm);
    const stepCount = activityType === 'cycle' ? 0 : Math.round(km * 1350);

    try {
      const currentSteps = tracking?.steps || 0;
      const currentBurned = tracking?.caloriesBurned || 0;
      const currentWorkoutMin = tracking?.workoutMinutes || 0;
      const res = await api.post(ENDPOINTS.LOG_TRACKING, {
        steps: currentSteps + stepCount,
        caloriesBurned: currentBurned + calBurned,
        workoutMinutes: currentWorkoutMin + min,
        workoutCompleted: true,
      });
      if (res.success) {
        setTracking(res.data);
        showToast(activityType === 'run' ? '🏃' : '🚶', `${activityType === 'run' ? 'Run' : 'Walk'} Logged`, `${km} km • ~${stepCount} steps • ${calBurned} kcal burned`);
        setShowWalkModal(false);
        setWalkKm('');
        setWalkMin('');
      }
    } catch (e) { Alert.alert('Error', 'Failed to log activity'); }
  };

  // Auto-search food database when user types
  const searchFoodDB = useCallback((query) => {
    if (foodSearchTimer.current) clearTimeout(foodSearchTimer.current);
    if (!query || query.length < 2) { setFoodResults([]); return; }
    foodSearchTimer.current = setTimeout(async () => {
      try {
        setFoodSearching(true);
        const res = await api.get(`${ENDPOINTS.FOOD}?q=${encodeURIComponent(query)}&limit=6`);
        if (res.success && res.data) {
          setFoodResults(res.data);
        }
      } catch (e) { /* silent */ }
      finally { setFoodSearching(false); }
    }, 300);
  }, []);

  const selectFood = (food) => {
    setMealName(food.name);
    setMealCalories(String(food.calories));
    setMealProtein(String(food.protein));
    setFoodResults([]);
  };

  const handleMealNameChange = (text) => {
    setMealName(text);
    searchFoodDB(text);
  };

  const logMealEntry = async () => {
    if (!mealName.trim()) { Alert.alert('Error', 'Enter what you ate'); return; }
    const cal = parseInt(mealCalories) || 0;
    const protein = parseFloat(mealProtein) || 0;
    try {
      const res = await api.post(ENDPOINTS.LOG_MEAL, {
        mealType,
        items: [{ name: mealName.trim(), calories: cal, protein }],
        totalCalories: cal,
      });
      if (res.success) {
        setTracking(res.data);
        showToast('🍽', `Added to ${mealType}`, `${mealName} • ${cal} kcal${protein > 0 ? ` • ${protein}g protein` : ''}`);
        setShowMealModal(false);
        setMealName('');
        setMealCalories('');
        setMealProtein('');
      }
    } catch (e) { Alert.alert('Error', 'Failed to log meal'); }
  };

  const logSleepEntry = async () => {
    const hours = parseFloat(sleepHours);
    if (!hours || hours < 0) { Alert.alert('Error', 'Enter valid sleep hours'); return; }
    try {
      const res = await api.post(ENDPOINTS.LOG_TRACKING, { sleepHours: hours });
      if (res.success) {
        setTracking(res.data);
        showToast('😴', 'Sleep Logged', `${hours} hours of sleep`);
        setShowSleepModal(false);
      }
    } catch (e) { Alert.alert('Error', 'Failed to log sleep'); }
  };

  const logExerciseEntry = async () => {
    if (selectedExercises.length === 0) return;
    const totalCalBurned = selectedExercises.reduce((acc, e) => acc + e.calories, 0);
    try {
      const currentBurned = tracking?.caloriesBurned || 0;
      const res = await api.post(ENDPOINTS.LOG_TRACKING, {
        caloriesBurned: currentBurned + totalCalBurned,
        workoutCompleted: true,
      });
      if (res.success) {
        setTracking(res.data);
        showToast('🏋️', 'Workout Logged', `${selectedExercises.length} exercises • ${totalCalBurned} kcal burned`);
        setShowExerciseModal(false);
        setSelectedExercises([]);
      }
    } catch (e) { Alert.alert('Error', 'Failed to log exercise'); }
  };

  const logWeightEntry = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 20 || w > 300) { Alert.alert('Error', 'Enter a valid weight (20-300 kg)'); return; }
    try {
      const res = await api.put(ENDPOINTS.UPDATE_PROFILE, { weight: w });
      if (res.success) {
        // Server recalculates BMR, BMI, dailyCalories, proteinNeed via pre-save hook
        const updatedUser = res.user || { ...userProfile, weight: w };
        setUserProfile(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        showToast('⚖️', 'Weight Updated', `${w} kg | BMR: ${updatedUser.bmr || '--'} kcal`);
        setShowWeightModal(false);
        setWeightInput('');
        // Reload tracking data so calorie goals update
        loadData();
      }
    } catch (e) { Alert.alert('Error', 'Failed to update weight'); }
  };

  // ===== GOAL RECOMMENDATION =====
  const getGoalInfo = () => {
    if (!userProfile) return { icon: '🎯', title: 'Set Your Goal', desc: 'Complete your profile to get personalized recommendations', targetCalories: 2000, proteinTarget: 80, color: COLORS.primary, tips: [] };

    const dailyCal = userProfile.dailyCalories || 2000;
    const bmr = userProfile.bmr || Math.round(dailyCal / 1.55);
    const protein = userProfile.proteinNeed || 80;
    const goal = userProfile.fitnessGoal || 'maintenance';
    const w = userProfile.weight || 70;
    const tw = userProfile.targetWeight || w;
    const diff = Math.abs(tw - w);

    // Research-based calorie & protein targets (ICMR 2020, ACSM, ISSN position papers)
    // Safe deficit: TDEE - 500 kcal (never below BMR) → ~0.5 kg/week loss
    // Surplus: +300-500 kcal for lean gain
    const safeDeficit = Math.max(bmr, dailyCal - 500);
    switch (goal) {
      case 'weight_loss':
        return {
          icon: '🔥', title: 'Weight Loss Mode', color: COLORS.secondary,
          desc: `Target: lose ${diff > 0 ? diff : 5} kg. Eat ~${safeDeficit} kcal/day (500 kcal deficit, never below BMR ${bmr}).`,
          targetCalories: safeDeficit, proteinTarget: Math.round(w * 1.6),
          tips: [
            `Eat ${Math.round(w * 1.6)}g protein/day to preserve muscle (ISSN)`,
            'Avoid sugary drinks, maida, fried snacks',
            'Walk 8000-10000 steps daily for NEAT deficit',
            'Eat more dal, paneer, eggs, soya for satiety',
          ],
        };
      case 'fat_loss':
        return {
          icon: '⚡', title: 'Fat Loss Mode', color: '#FF9800',
          desc: `Reduce body fat while preserving muscle. Eat ~${safeDeficit} kcal/day with high protein.`,
          targetCalories: safeDeficit, proteinTarget: Math.round(w * 2.0),
          tips: [
            `High protein: ${Math.round(w * 2.0)}g/day (ISSN recommendation)`,
            'Combine strength training + HIIT cardio',
            'Reduce refined carbs (maida, white rice, sugar)',
            'Sleep 7-9 hours — cortisol disrupts fat loss',
          ],
        };
      case 'weight_gain':
        return {
          icon: '💪', title: 'Weight Gain Mode', color: '#4CAF50',
          desc: `Target: gain ${diff > 0 ? diff : 5} kg. Eat ~${Math.round(dailyCal + 400)} kcal/day (+400 surplus for lean gain).`,
          targetCalories: Math.round(dailyCal + 400), proteinTarget: Math.round(w * 1.6),
          tips: [
            'Eat 5-6 meals per day — don\'t skip breakfast',
            'Include banana shake, peanut butter, ghee, dry fruits',
            `Eat ${Math.round(w * 1.6)}g protein/day (dal, paneer, chicken, eggs)`,
            'Strength train 3-4x/week — muscles need stimulus to grow',
          ],
        };
      case 'muscle_building':
        return {
          icon: '🏋️', title: 'Muscle Building Mode', color: COLORS.primary,
          desc: `Lean muscle gain. Eat ~${Math.round(dailyCal + 300)} kcal/day (+300 surplus) with ${Math.round(w * 1.8)}g protein.`,
          targetCalories: Math.round(dailyCal + 300), proteinTarget: Math.round(w * 1.8),
          tips: [
            `${Math.round(w * 1.8)}g protein/day — split across 4-5 meals (ISSN)`,
            'Progressive overload: increase weight/reps weekly',
            'Post-workout: 20-40g protein within 2 hours',
            'Sleep 7-9 hours — muscle recovery needs quality sleep',
          ],
        };
      case 'height_growth':
        return {
          icon: '📏', title: 'Growth & Posture Focus', color: COLORS.accent,
          desc: `Nutrition for growth. Eat ~${Math.round(dailyCal * 1.1)} kcal/day with calcium & vitamin D.`,
          targetCalories: Math.round(dailyCal * 1.1), proteinTarget: Math.round(w * 1.4),
          tips: [
            'Sleep 8-10 hours — growth hormone peaks during deep sleep',
            'Eat calcium-rich: milk, curd, ragi, paneer (1000mg/day)',
            'Get 15-20 min sunlight for Vitamin D',
            'Daily stretching, hanging, swimming help posture & spine',
          ],
        };
      case 'gym_workout':
        return {
          icon: '🏋️', title: 'Gym Performance', color: COLORS.primary,
          desc: `Fuel workouts. Eat ~${Math.round(dailyCal * 1.1)} kcal/day with adequate protein & carbs.`,
          targetCalories: Math.round(dailyCal * 1.1), proteinTarget: Math.round(w * 1.6),
          tips: [
            'Pre-workout: banana + oats 30-60 min before',
            'Post-workout: protein shake/eggs within 1-2 hours',
            'Stay hydrated — drink 3-4L water on workout days',
            'Rest 48 hours between same muscle group training',
          ],
        };
      case 'home_workout':
        return {
          icon: '🏠', title: 'Home Workout Mode', color: COLORS.success,
          desc: `Balanced nutrition at ~${dailyCal} kcal/day with bodyweight training.`,
          targetCalories: dailyCal, proteinTarget: Math.round(w * 1.4),
          tips: [
            'Be consistent: 4-5 sessions per week, 30-45 min',
            'Focus on push-ups, squats, lunges, planks',
            `Eat ${Math.round(w * 1.4)}g protein/day for recovery`,
            'Eat whole foods: roti, dal, sabzi, curd, fruits',
          ],
        };
      default:
        return {
          icon: '🧘', title: 'Maintain & Stay Fit', color: COLORS.success,
          desc: `Eat ~${dailyCal} kcal/day to maintain weight with balanced nutrition.`,
          targetCalories: dailyCal, proteinTarget: protein,
          tips: [
            'Balanced plate: 50% veggies, 25% protein, 25% carbs',
            'Walk 7000-10000 steps daily',
            'Drink 8-10 glasses of water daily',
            'Sleep 7-8 hours consistently',
          ],
        };
    }
  };

  // ===== COMPUTED VALUES =====
  const cal = tracking?.caloriesConsumed || 0;
  const goalInfo = getGoalInfo();
  const calGoal = tracking?.caloriesGoal || goalInfo.targetCalories;
  const water = tracking?.waterIntake || 0;
  const waterGoal = tracking?.waterGoal || 8;
  const steps = tracking?.steps || 0;
  const stepsGoal = tracking?.stepsGoal || 10000;
  const sleep = tracking?.sleepHours || 0;
  const sleepGoal = tracking?.sleepGoal || 8;
  const burned = tracking?.caloriesBurned || 0;
  const meals = tracking?.mealsLogged || [];
  const currentMood = tracking?.mood;

  const formatSteps = (s) => s >= 1000 ? `${(s / 1000).toFixed(1)}K` : `${s}`;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Daily Routine" subtitle="Track Your Day" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Tab Selector */}
        <View style={styles.tabs}>
          {['daily', 'weekly'].map((tab) => (
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

        {activeTab === 'daily' ? (
          <>
            {/* ===== PERSONALIZED GOAL BANNER ===== */}
            {userProfile && (
              <GradientCard colors={[goalInfo.color + '15', COLORS.darkCard]} style={{ marginBottom: 16 }}>
                <View style={styles.goalBanner}>
                  <View style={styles.goalBannerHeader}>
                    <Text style={styles.goalBannerIcon}>{goalInfo.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalBannerTitle}>{goalInfo.title}</Text>
                      <Text style={styles.goalBannerDesc}>{goalInfo.desc}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowCalorieInfo(true)} style={styles.infoBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="information-circle-outline" size={22} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.goalTargetsRow}>
                    <View style={styles.goalTarget}>
                      <Text style={[styles.goalTargetValue, { color: COLORS.secondary }]}>{goalInfo.targetCalories}</Text>
                      <Text style={styles.goalTargetLabel}>Target kcal</Text>
                    </View>
                    <View style={styles.goalTargetDivider} />
                    <View style={styles.goalTarget}>
                      <Text style={[styles.goalTargetValue, { color: COLORS.accent }]}>{goalInfo.proteinTarget}g</Text>
                      <Text style={styles.goalTargetLabel}>Protein</Text>
                    </View>
                    <View style={styles.goalTargetDivider} />
                    <View style={styles.goalTarget}>
                      <Text style={[styles.goalTargetValue, { color: cal > goalInfo.targetCalories ? COLORS.error : COLORS.success }]}>
                        {cal > goalInfo.targetCalories ? '+' : ''}{cal - goalInfo.targetCalories}
                      </Text>
                      <Text style={styles.goalTargetLabel}>{cal > goalInfo.targetCalories ? 'Over' : 'Remaining'}</Text>
                    </View>
                    {userProfile?.goalTimeline && (
                      <>
                        <View style={styles.goalTargetDivider} />
                        <View style={styles.goalTarget}>
                          <Text style={[styles.goalTargetValue, { color: COLORS.accent }]}>
                            {(() => {
                              if (!userProfile.goalStartDate) return `${userProfile.goalTimeline}m`;
                              const start = new Date(userProfile.goalStartDate);
                              const end = new Date(start);
                              end.setMonth(end.getMonth() + userProfile.goalTimeline);
                              const now = new Date();
                              const daysLeft = Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)));
                              return daysLeft > 0 ? `${daysLeft}d` : 'Done!';
                            })()}
                          </Text>
                          <Text style={styles.goalTargetLabel}>Days Left</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </GradientCard>
            )}

            {/* ===== WATER TRACKER (dedicated card with +/- controls) ===== */}
            <GradientCard colors={[COLORS.accent + '15', COLORS.darkCard]} style={{ marginBottom: 16 }}>
              <View style={styles.waterHeader}>
                <View style={styles.waterTitleRow}>
                  <Text style={styles.waterEmoji}>💧</Text>
                  <View>
                    <Text style={styles.waterTitle}>Water Intake</Text>
                    <Text style={styles.waterSub}>{water * 250} ml of {waterGoal * 250} ml</Text>
                  </View>
                </View>
                <Text style={[styles.waterCount, { color: COLORS.accent }]}>
                  {water}<Text style={styles.waterCountTotal}>/{waterGoal}</Text>
                </Text>
              </View>

              {/* Glass indicators (max 16 icons, then +N badge) */}
              <View style={styles.waterGlasses}>
                {Array.from({ length: Math.min(16, Math.max(waterGoal, water)) }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < water ? 'water' : 'water-outline'}
                    size={26}
                    color={i < water ? COLORS.accent : COLORS.textMuted + '60'}
                  />
                ))}
                {water > 16 && (
                  <View style={styles.waterMoreBadge}>
                    <Text style={styles.waterMoreText}>+{water - 16}</Text>
                  </View>
                )}
              </View>

              {/* − / + controls */}
              <View style={styles.waterControls}>
                <TouchableOpacity
                  style={[styles.waterBtn, water <= 0 && styles.waterBtnDisabled]}
                  onPress={() => addWater(-1)}
                  disabled={water <= 0}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={28} color={water <= 0 ? COLORS.textMuted : COLORS.accent} />
                </TouchableOpacity>
                <View style={styles.waterProgressWrap}>
                  <View style={styles.waterProgressBar}>
                    <View style={[styles.waterProgressFill, { width: `${Math.min(100, Math.round((water / waterGoal) * 100))}%` }]} />
                  </View>
                  <Text style={styles.waterProgressLabel}>
                    {water >= MAX_WATER ? '✋ Max limit (20) reached' : water >= waterGoal ? '🎉 Daily goal complete!' : `${waterGoal - water} glass${waterGoal - water > 1 ? 'es' : ''} to go`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.waterBtn, water >= MAX_WATER && styles.waterBtnDisabled]}
                  onPress={() => addWater(1)}
                  disabled={water >= MAX_WATER}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={28} color={water >= MAX_WATER ? COLORS.textMuted : COLORS.accent} />
                </TouchableOpacity>
              </View>
            </GradientCard>

            {/* ===== QUICK ACTIONS (2-column broad cards) ===== */}
            <Text style={styles.sectionTitle}>⚡ Quick Log</Text>
            <View style={styles.quickGrid}>
              {[
                { icon: '🍽', label: 'Log Meal', desc: `${meals.length} meal${meals.length !== 1 ? 's' : ''} logged`, color: COLORS.warning, onPress: () => { setMealType(getMealTypeByTime()); setShowMealModal(true); }, value: `${cal} / ${calGoal} kcal` },
                { icon: '🚶', label: 'Walk / Run', desc: `${formatSteps(steps)} steps today`, color: '#4CAF50', onPress: () => setShowWalkModal(true), value: `${burned} kcal burned` },
                { icon: '🏋️', label: 'Log Exercise', desc: 'Pick from exercises', color: COLORS.primary, onPress: () => setShowExerciseModal(true), value: `${burned} kcal total` },
                { icon: '😴', label: 'Log Sleep', desc: sleep > 0 ? `${sleep}h logged today` : 'Not logged yet', color: '#9C27B0', onPress: () => setShowSleepModal(true), value: sleep > 0 ? `${sleep} / ${sleepGoal}h` : '— / 8h' },
                { icon: '⚖️', label: 'Log Weight', desc: `Current: ${userProfile?.weight || '--'} kg`, color: '#607D8B', onPress: () => { setWeightInput(String(userProfile?.weight || '')); setShowWeightModal(true); }, value: `Target: ${userProfile?.targetWeight || '--'} kg` },
                { icon: '🍎', label: 'Food Database', desc: 'Search nutrition info', color: '#FF6B6B', onPress: () => navigation.navigate('FoodDatabase'), value: 'Browse & Log' },
              ].map((a, i) => (
                <TouchableOpacity key={i} style={styles.quickItem} onPress={a.onPress} activeOpacity={0.8}>
                  <LinearGradient colors={[a.color + '18', COLORS.darkCard]} style={styles.quickItemGrad}>
                    <View style={styles.quickItemHeader}>
                      <Text style={styles.quickIcon}>{a.icon}</Text>
                      <Text style={[styles.quickValueBadge, { color: a.color }]}>{a.value}</Text>
                    </View>
                    <Text style={styles.quickLabel}>{a.label}</Text>
                    <Text style={styles.quickDesc}>{a.desc}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* ===== TODAY'S SUMMARY ===== */}
            <Text style={styles.sectionTitle}>📊 Today's Summary</Text>
            <View style={styles.statsRow}>
              {[
                { icon: '🔥', label: 'Calories', value: `${cal}`, target: `${calGoal}`, color: COLORS.secondary, progress: calGoal > 0 ? Math.round((cal / calGoal) * 100) : 0 },
                { icon: '💧', label: 'Water', value: `${water}`, target: `${waterGoal} glass`, color: COLORS.accent, progress: waterGoal > 0 ? Math.round((water / waterGoal) * 100) : 0 },
                { icon: '👟', label: 'Steps', value: formatSteps(steps), target: formatSteps(stepsGoal), color: COLORS.success, progress: stepsGoal > 0 ? Math.round((steps / stepsGoal) * 100) : 0 },
              ].map((s, i) => (
                <View key={i} style={styles.statCardSmall}>
                  <LinearGradient colors={[s.color + '15', COLORS.darkCard]} style={styles.statGradSmall}>
                    <ProgressRing progress={Math.min(100, s.progress)} size={60} strokeWidth={6} color={s.color} value={s.value} />
                    <Text style={styles.statLabel}>{s.label}</Text>
                    <Text style={styles.statTarget}>{s.target}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>

            {/* Extra Stats */}
            <View style={styles.extraStats}>
              <View style={[styles.extraCard, { borderColor: '#9C27B020' }]}>
                <Text style={styles.extraIcon}>😴</Text>
                <Text style={styles.extraValue}>{sleep}h</Text>
                <Text style={styles.extraLabel}>Sleep</Text>
              </View>
              <View style={[styles.extraCard, { borderColor: COLORS.secondary + '20' }]}>
                <Text style={styles.extraIcon}>🔥</Text>
                <Text style={styles.extraValue}>{burned}</Text>
                <Text style={styles.extraLabel}>Burned</Text>
              </View>
              <View style={[styles.extraCard, { borderColor: COLORS.primary + '20' }]}>
                <Text style={styles.extraIcon}>🍽</Text>
                <Text style={styles.extraValue}>{meals.length}</Text>
                <Text style={styles.extraLabel}>Meals</Text>
              </View>
            </View>

            {/* ===== TODAY'S LOG TIMELINE ===== */}
            <Text style={styles.sectionTitle}>📝 Today's Log</Text>
            <GradientCard>
              {meals.length === 0 && steps === 0 && sleep === 0 && water === 0 ? (
                <View style={styles.emptyLog}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>Nothing logged yet today</Text>
                  <Text style={styles.emptyHint}>Use Quick Log above to start tracking your day!</Text>
                </View>
              ) : (
                <>
                  {water > 0 && (
                    <View style={styles.logItem}>
                      <View style={[styles.logDot, { backgroundColor: COLORS.accent }]} />
                      <View style={styles.logInfo}>
                        <Text style={styles.logTitle}>💧 Water Intake</Text>
                        <Text style={styles.logDesc}>{water} glasses ({water * 250}ml)</Text>
                      </View>
                      <Text style={[styles.logBadge, { color: COLORS.accent }]}>{water}/{waterGoal}</Text>
                    </View>
                  )}

                  {steps > 0 && (
                    <View style={styles.logItem}>
                      <View style={[styles.logDot, { backgroundColor: COLORS.success }]} />
                      <View style={styles.logInfo}>
                        <Text style={styles.logTitle}>🚶 Walking / Activity</Text>
                        <Text style={styles.logDesc}>{formatSteps(steps)} steps, {burned} kcal burned</Text>
                      </View>
                      <Text style={[styles.logBadge, { color: COLORS.success }]}>~{(steps / 1300).toFixed(1)} km</Text>
                    </View>
                  )}

                  {meals.map((meal, i) => (
                    <View key={i} style={styles.logItem}>
                      <View style={[styles.logDot, { backgroundColor: COLORS.warning }]} />
                      <View style={styles.logInfo}>
                        <Text style={styles.logTitle}>
                          {meal.mealType === 'breakfast' ? '🌅' : meal.mealType === 'lunch' ? '☀️' : meal.mealType === 'dinner' ? '🌙' : '🍪'}{' '}
                          {meal.mealType?.charAt(0).toUpperCase() + meal.mealType?.slice(1)}
                        </Text>
                        <Text style={styles.logDesc}>
                          {meal.items?.map(i => i.name).join(', ') || 'Meal logged'}
                        </Text>
                      </View>
                      <Text style={[styles.logBadge, { color: COLORS.warning }]}>{meal.totalCalories} kcal</Text>
                    </View>
                  ))}

                  {sleep > 0 && (
                    <View style={styles.logItem}>
                      <View style={[styles.logDot, { backgroundColor: '#9C27B0' }]} />
                      <View style={styles.logInfo}>
                        <Text style={styles.logTitle}>😴 Sleep</Text>
                        <Text style={styles.logDesc}>{sleep} hours ({sleep >= sleepGoal ? 'Goal met!' : `${sleepGoal - sleep}h short`})</Text>
                      </View>
                      <Text style={[styles.logBadge, { color: '#9C27B0' }]}>{sleep}/{sleepGoal}h</Text>
                    </View>
                  )}
                </>
              )}
            </GradientCard>

            {/* ===== MOOD TRACKER ===== */}
            <Text style={styles.sectionTitle}>😊 How do you feel today?</Text>
            <View style={styles.moodRow}>
              {[
                { emoji: '😊', label: 'Great', key: 'great' },
                { emoji: '🙂', label: 'Good', key: 'good' },
                { emoji: '😐', label: 'Okay', key: 'okay' },
                { emoji: '😢', label: 'Bad', key: 'bad' },
                { emoji: '😩', label: 'Terrible', key: 'terrible' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodBtn, currentMood === m.key && styles.moodBtnActive]}
                  onPress={() => logMood(m.key)}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, currentMood === m.key && { color: COLORS.primary }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* ===== WEEKLY TAB ===== */
          <>
            <Text style={styles.sectionTitle}>📊 Weekly Summary</Text>
            {weeklyData ? (
              <GradientCard>
                <View style={styles.weeklySummaryGrid}>
                  {[
                    { label: 'Avg Calories', value: `${weeklyData.avgCalories}`, icon: '🔥', color: COLORS.secondary },
                    { label: 'Avg Water', value: `${weeklyData.avgWater} glass`, icon: '💧', color: COLORS.accent },
                    { label: 'Avg Steps', value: formatSteps(weeklyData.avgSteps), icon: '👟', color: COLORS.success },
                    { label: 'Avg Sleep', value: `${weeklyData.avgSleep}h`, icon: '😴', color: '#9C27B0' },
                    { label: 'Workouts', value: `${weeklyData.workoutsCompleted}/7`, icon: '🏋️', color: COLORS.primary },
                    { label: 'Weight Change', value: `${weeklyData.weightChange > 0 ? '+' : ''}${weeklyData.weightChange} kg`, icon: '⚖️', color: weeklyData.weightChange <= 0 ? COLORS.success : COLORS.warning },
                  ].map((s, i) => (
                    <View key={i} style={[styles.weekStatCard, { borderColor: s.color + '30' }]}>
                      <Text style={styles.weekStatIcon}>{s.icon}</Text>
                      <Text style={[styles.weekStatValue, { color: s.color }]}>{s.value}</Text>
                      <Text style={styles.weekStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </GradientCard>
            ) : (
              <GradientCard>
                <Text style={styles.emptyText}>No weekly data yet. Keep logging daily!</Text>
              </GradientCard>
            )}

            {weeklyData?.dailyData?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>📅 Day by Day</Text>
                {weeklyData.dailyData.map((day, i) => {
                  const d = new Date(day.date);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <GradientCard key={i} style={{ marginBottom: 8 }}>
                      <View style={styles.dayBreakdown}>
                        <View style={styles.dayInfo}>
                          <Text style={styles.dayName}>{dayName}</Text>
                          <Text style={styles.dayDate}>{dateStr}</Text>
                        </View>
                        <View style={styles.dayStats}>
                          <Text style={styles.dayStat}>🔥{day.caloriesConsumed}</Text>
                          <Text style={styles.dayStat}>💧{day.waterIntake}</Text>
                          <Text style={styles.dayStat}>👟{formatSteps(day.steps)}</Text>
                          <Text style={styles.dayStat}>😴{day.sleepHours}h</Text>
                        </View>
                        {day.workoutCompleted && (
                          <View style={styles.workoutDone}>
                            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                          </View>
                        )}
                      </View>
                    </GradientCard>
                  );
                })}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ===== WALK/RUN MODAL ===== */}
      <Modal visible={showWalkModal} transparent animationType="slide" onRequestClose={() => setShowWalkModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <LinearGradient colors={[COLORS.darkCard, COLORS.dark]} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🚶 Log Activity</Text>
                  <TouchableOpacity onPress={() => setShowWalkModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.typeRow}>
                  {[
                    { key: 'walk', icon: '🚶', label: 'Walk', kcal: `~${Math.round((userProfile?.weight || 60) * 0.72)} kcal/km` },
                    { key: 'run', icon: '🏃', label: 'Run', kcal: `~${Math.round((userProfile?.weight || 60) * 1.03)} kcal/km` },
                    { key: 'cycle', icon: '🚴', label: 'Cycle', kcal: `~${Math.round((userProfile?.weight || 60) * 0.45)} kcal/km` },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.typeBtn, activityType === t.key && styles.typeBtnActive]}
                      onPress={() => setActivityType(t.key)}
                    >
                      <Text style={styles.typeIcon}>{t.icon}</Text>
                      <Text style={[styles.typeLabel, activityType === t.key && { color: COLORS.primary }]}>{t.label}</Text>
                      <Text style={styles.typeKcal}>{t.kcal}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Distance (km)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., 2.5"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={walkKm}
                  onChangeText={setWalkKm}
                />

                <Text style={styles.inputLabel}>Duration (minutes) - Optional</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., 30"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  value={walkMin}
                  onChangeText={setWalkMin}
                />

                {walkKm > 0 && (() => {
                  const km = parseFloat(walkKm) || 0;
                  const w = userProfile?.weight || 60;
                  const kcalPerKm = activityType === 'run' ? Math.round(w * 1.03) : activityType === 'cycle' ? Math.round(w * 0.45) : Math.round(w * 0.72);
                  const estSteps = activityType === 'cycle' ? 0 : Math.round(km * 1350);
                  return (
                    <View style={styles.previewBox}>
                      <Text style={styles.previewText}>
                        📊 {estSteps > 0 ? `~${estSteps} steps | ` : ''}~{Math.round(km * kcalPerKm)} kcal burned
                      </Text>
                    </View>
                  );
                })()}

                <TouchableOpacity style={styles.submitBtn} onPress={logWalkActivity}>
                  <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.submitGrad}>
                    <Text style={styles.submitText}>Log Activity</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== MEAL MODAL (Enhanced with suggestions) ===== */}
      <Modal visible={showMealModal} transparent animationType="slide" onRequestClose={() => setShowMealModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <LinearGradient colors={[COLORS.darkCard, COLORS.dark]} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🍽 Log Meal</Text>
                  <TouchableOpacity onPress={() => setShowMealModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Meal Type */}
              <View style={styles.mealTypeRow}>
                {['breakfast', 'lunch', 'dinner', 'snack'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.mealTypeChip, mealType === m && styles.mealTypeChipActive]}
                    onPress={() => setMealType(m)}
                  >
                    <Text style={styles.mealTypeIcon}>
                      {m === 'breakfast' ? '🌅' : m === 'lunch' ? '☀️' : m === 'dinner' ? '🌙' : '🍪'}
                    </Text>
                    <Text style={[styles.mealTypeText, mealType === m && { color: COLORS.primary }]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Food Suggestions - filtered by diet preference */}
              <Text style={styles.inputLabel}>Quick Add</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 90 }}>
                {((DIET_MEAL_SUGGESTIONS[userProfile?.dietPreference] || DIET_MEAL_SUGGESTIONS.veg)[mealType === 'snack' ? 'snacks' : mealType] || []).map((food, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.foodSuggestion, mealName === food.name && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' }]}
                    onPress={() => { setMealName(food.name); setMealCalories(String(food.calories)); setMealProtein(String(food.protein)); }}
                  >
                    <Text style={styles.foodSugIcon}>{food.icon}</Text>
                    <Text style={styles.foodSugName} numberOfLines={1}>{food.name}</Text>
                    <Text style={styles.foodSugCal}>{food.calories} kcal</Text>
                    <Text style={styles.foodSugProtein}>P: {food.protein}g</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>What did you eat?</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Type food name (e.g. roti, rice, paneer)"
                  placeholderTextColor={COLORS.textMuted}
                  value={mealName}
                  onChangeText={handleMealNameChange}
                />
                {foodSearching && (
                  <View style={{ position: 'absolute', right: 12, top: 12 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>...</Text>
                  </View>
                )}
              </View>

              {/* Auto Search Results */}
              {foodResults.length > 0 && (
                <ScrollView style={{ maxHeight: 180, marginTop: -4, marginBottom: 8 }} nestedScrollEnabled>
                  {foodResults.map((food) => (
                    <TouchableOpacity
                      key={food.id}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 10, paddingHorizontal: 14,
                        backgroundColor: COLORS.darkCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
                        borderRadius: 8, marginBottom: 4,
                      }}
                      onPress={() => selectFood(food)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '600' }}>{food.name}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                          {food.serving} {food.hindiName ? `• ${food.hindiName}` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>{food.calories} kcal</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Calories (kcal)</Text>
                  <TextInput
                    style={[styles.modalInput, mealCalories ? { borderColor: COLORS.primary + '40' } : {}]}
                    placeholder="auto or manual"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    value={mealCalories}
                    onChangeText={setMealCalories}
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Protein (g)</Text>
                  <TextInput
                    style={[styles.modalInput, mealProtein ? { borderColor: COLORS.primary + '40' } : {}]}
                    placeholder="auto or manual"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    value={mealProtein}
                    onChangeText={setMealProtein}
                  />
                </View>
              </View>

              {mealName.trim() && mealCalories && (
                <View style={styles.mealPreview}>
                  <Text style={styles.mealPreviewText}>
                    {mealType === 'breakfast' ? '🌅' : mealType === 'lunch' ? '☀️' : mealType === 'dinner' ? '🌙' : '🍪'}{' '}
                    {mealName} • {mealCalories} kcal{mealProtein ? ` • ${mealProtein}g protein` : ''}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={logMealEntry}>
                <LinearGradient colors={COLORS.gradient1} style={styles.submitGrad}>
                  <Text style={styles.submitText}>Log Meal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== SLEEP MODAL ===== */}
      <Modal visible={showSleepModal} transparent animationType="slide" onRequestClose={() => setShowSleepModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={[COLORS.darkCard, COLORS.dark]} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>😴 Log Sleep</Text>
                <TouchableOpacity onPress={() => setShowSleepModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Hours of Sleep</Text>
              <View style={styles.sleepSelector}>
                {['4', '5', '6', '7', '8', '9', '10'].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.sleepBtn, sleepHours === h && styles.sleepBtnActive]}
                    onPress={() => setSleepHours(h)}
                  >
                    <Text style={[styles.sleepBtnText, sleepHours === h && { color: '#9C27B0' }]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sleepTip}>
                {parseInt(sleepHours) >= 8 ? '✅ Great! Meeting your sleep goal' :
                 parseInt(sleepHours) >= 6 ? '⚠️ Could be better. Aim for 7-8 hours' :
                 '❌ Too little sleep. Try to sleep more for recovery'}
              </Text>

              <TouchableOpacity style={styles.submitBtn} onPress={logSleepEntry}>
                <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.submitGrad}>
                  <Text style={styles.submitText}>Log Sleep</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ===== EXERCISE MODAL ===== */}
      <Modal visible={showExerciseModal} transparent animationType="slide" onRequestClose={() => setShowExerciseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <LinearGradient colors={[COLORS.darkCard, COLORS.dark]} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🏋️ Log Exercise</Text>
                <TouchableOpacity onPress={() => { setShowExerciseModal(false); setSelectedExercises([]); }}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Select Muscle Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {WORKOUT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.exCatChip, selectedExCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}
                    onPress={() => setSelectedExCategory(cat.id)}
                  >
                    <Text style={styles.exCatIcon}>{cat.icon}</Text>
                    <Text style={[styles.exCatText, selectedExCategory === cat.id && { color: cat.color }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Tap exercises to select ({selectedExercises.length} selected)</Text>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {(EXERCISES[selectedExCategory] || []).map((ex, idx) => {
                  const isSelected = selectedExercises.some(e => e.name === ex.name);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.exItem, isSelected && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' }]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedExercises(prev => prev.filter(e => e.name !== ex.name));
                        } else {
                          setSelectedExercises(prev => [...prev, ex]);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exItemName}>{ex.name}</Text>
                        <Text style={styles.exItemMeta}>{ex.sets}×{ex.reps} • {ex.duration} • {ex.muscle}</Text>
                      </View>
                      <View style={styles.exItemRight}>
                        <Text style={[styles.exItemCal, { color: COLORS.secondary }]}>{ex.calories} kcal</Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedExercises.length > 0 && (
                <View style={styles.exSummary}>
                  <Text style={styles.exSummaryText}>
                    {selectedExercises.length} exercise{selectedExercises.length > 1 ? 's' : ''} • {selectedExercises.reduce((acc, e) => acc + e.calories, 0)} kcal total
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedExercises.map((ex, i) => (
                      <View key={i} style={styles.exSelectedChip}>
                        <Text style={styles.exSelectedText}>{ex.name}</Text>
                        <TouchableOpacity onPress={() => setSelectedExercises(prev => prev.filter(e => e.name !== ex.name))}>
                          <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, selectedExercises.length === 0 && { opacity: 0.5 }]}
                onPress={logExerciseEntry}
                disabled={selectedExercises.length === 0}
              >
                <LinearGradient colors={COLORS.gradient1} style={styles.submitGrad}>
                  <Text style={styles.submitText}>
                    Log {selectedExercises.length > 0 ? `${selectedExercises.length} Exercise${selectedExercises.length > 1 ? 's' : ''}` : 'Exercise'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ===== WEIGHT MODAL ===== */}
      <Modal visible={showWeightModal} transparent animationType="slide" onRequestClose={() => setShowWeightModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={[COLORS.darkCard, COLORS.dark]} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>⚖️ Log Weight</Text>
                <TouchableOpacity onPress={() => setShowWeightModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {userProfile && (
                <View style={styles.weightInfo}>
                  <View style={styles.weightInfoItem}>
                    <Text style={styles.weightInfoLabel}>Current</Text>
                    <Text style={[styles.weightInfoValue, { color: COLORS.white }]}>{userProfile.weight || '--'} kg</Text>
                  </View>
                  <View style={styles.weightInfoDivider} />
                  <View style={styles.weightInfoItem}>
                    <Text style={styles.weightInfoLabel}>Target</Text>
                    <Text style={[styles.weightInfoValue, { color: COLORS.primary }]}>{userProfile.targetWeight || '--'} kg</Text>
                  </View>
                  <View style={styles.weightInfoDivider} />
                  <View style={styles.weightInfoItem}>
                    <Text style={styles.weightInfoLabel}>Difference</Text>
                    <Text style={[styles.weightInfoValue, { color: (userProfile.targetWeight || 0) >= (userProfile.weight || 0) ? COLORS.success : COLORS.secondary }]}>
                      {userProfile.weight && userProfile.targetWeight ? `${Math.abs(userProfile.targetWeight - userProfile.weight).toFixed(1)} kg` : '--'}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>Today's Weight (kg)</Text>
              <TextInput
                style={[styles.modalInput, { fontSize: SIZES.fontXl, textAlign: 'center' }]}
                placeholder="e.g., 72.5"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
              />

              {weightInput && userProfile?.weight && (
                <View style={styles.weightDiffBox}>
                  <Text style={[styles.weightDiffText, {
                    color: parseFloat(weightInput) < userProfile.weight ? COLORS.success :
                      parseFloat(weightInput) > userProfile.weight ? COLORS.warning : COLORS.textMuted
                  }]}>
                    {parseFloat(weightInput) < userProfile.weight
                      ? `↓ ${(userProfile.weight - parseFloat(weightInput)).toFixed(1)} kg lost`
                      : parseFloat(weightInput) > userProfile.weight
                        ? `↑ ${(parseFloat(weightInput) - userProfile.weight).toFixed(1)} kg gained`
                        : 'No change'}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={logWeightEntry}>
                <LinearGradient colors={['#607D8B', '#455A64']} style={styles.submitGrad}>
                  <Text style={styles.submitText}>Update Weight</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== CALORIE INFO MODAL (BMR / TDEE / Target) ===== */}
      <Modal visible={showCalorieInfo} transparent animationType="slide" onRequestClose={() => setShowCalorieInfo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={[COLORS.darkCard, COLORS.dark]} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📖 What do these numbers mean?</Text>
                <TouchableOpacity onPress={() => setShowCalorieInfo(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {(() => {
                const bmr = userProfile?.bmr || 1500;
                const tdee = userProfile?.dailyCalories || 2000;
                const target = goalInfo.targetCalories;
                return (
                  <>
                    <View style={[styles.infoRow, { borderLeftColor: COLORS.warning }]}>
                      <Text style={styles.infoRowTitle}>🛌 BMR — {bmr} kcal</Text>
                      <Text style={styles.infoRowDesc}>
                        Calories your body burns just to stay alive (breathing, heart, brain) — even if you rest all day. Never eat below this!
                      </Text>
                    </View>
                    <View style={[styles.infoRow, { borderLeftColor: COLORS.accent }]}>
                      <Text style={styles.infoRowTitle}>🚶 Daily Burn (TDEE) — {tdee} kcal</Text>
                      <Text style={styles.infoRowDesc}>
                        BMR + your daily activity & workouts. Eating exactly this much keeps your weight the same.
                      </Text>
                    </View>
                    <View style={[styles.infoRow, { borderLeftColor: COLORS.success }]}>
                      <Text style={styles.infoRowTitle}>🎯 Target — {target} kcal (your focus!)</Text>
                      <Text style={styles.infoRowDesc}>
                        {target < tdee
                          ? `Daily Burn minus a safe deficit. Eat ~${target} kcal daily → your body burns the gap (${tdee - target} kcal) from fat → steady weight loss.`
                          : target > tdee
                            ? `Daily Burn plus a surplus. Eat ~${target} kcal daily → the extra ${target - tdee} kcal fuels muscle & weight gain.`
                            : `Same as your Daily Burn — eat this much to maintain your current weight.`}
                      </Text>
                    </View>
                    <View style={styles.infoNote}>
                      <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.infoNoteText}>
                        We check your intake daily at 9 PM — you'll get a notification if you're over or under target.
                      </Text>
                    </View>
                  </>
                );
              })()}

              <TouchableOpacity style={styles.submitBtn} onPress={() => setShowCalorieInfo(false)}>
                <LinearGradient colors={COLORS.gradient1} style={styles.submitGrad}>
                  <Text style={styles.submitText}>Got it!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Animated.View style={[styles.toastWrap, { transform: [{ translateY: toastAnim }], opacity: toastOpacity }]}>
          <LinearGradient colors={[COLORS.darkCard, COLORS.darkCard]} style={styles.toastBox}>
            <Text style={styles.toastIcon}>{toast.icon}</Text>
            <View style={styles.toastInfo}>
              <Text style={styles.toastTitle}>{toast.title}</Text>
              <Text style={styles.toastMsg} numberOfLines={1}>{toast.msg}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
            }}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusSm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  tabTextActive: { color: COLORS.white, ...FONTS.bold },

  // Section
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },

  // Goal Banner
  goalBanner: {},
  goalBannerHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  goalBannerIcon: { fontSize: 32, marginRight: 12 },
  goalBannerTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  goalBannerDesc: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, marginTop: 4, lineHeight: 20 },
  goalTargetsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.darkBorder,
  },
  goalTarget: { alignItems: 'center', flex: 1 },
  goalTargetValue: { fontSize: SIZES.fontXl, ...FONTS.bold },
  goalTargetLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  goalTargetDivider: { width: 1, height: 30, backgroundColor: COLORS.darkBorder },
  // Calorie info modal
  infoBtn: { padding: 2, marginLeft: 6 },
  infoRow: {
    borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, marginBottom: 12,
    backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radiusSm, paddingRight: 10,
  },
  infoRowTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, marginBottom: 4 },
  infoRowDesc: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 19 },
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '12', borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.primary + '30', padding: 12, marginTop: 4,
  },
  infoNoteText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 17 },

  // Water Tracker
  waterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waterEmoji: { fontSize: 30 },
  waterTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  waterSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  waterCount: { fontSize: 30, ...FONTS.bold },
  waterCountTotal: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  waterGlasses: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    justifyContent: 'center', marginBottom: 16,
  },
  waterControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  waterBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.accent + '15',
    borderWidth: 1.5, borderColor: COLORS.accent + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  waterBtnDisabled: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  waterProgressWrap: { flex: 1, alignItems: 'center', gap: 6 },
  waterProgressBar: {
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: COLORS.darkBorder, overflow: 'hidden',
  },
  waterProgressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.accent },
  waterMoreBadge: {
    paddingHorizontal: 8, height: 26, borderRadius: 13,
    backgroundColor: COLORS.accent + '20', borderWidth: 1, borderColor: COLORS.accent + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  waterMoreText: { fontSize: SIZES.fontXs, color: COLORS.accent, ...FONTS.bold },
  waterProgressLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },

  // Quick Actions (2-column broad)
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickItem: {
    width: (width - 42) / 2,
    borderRadius: SIZES.radius, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  quickItemGrad: { padding: 14, borderRadius: SIZES.radius, minHeight: 100 },
  quickItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  quickIcon: { fontSize: 28 },
  quickValueBadge: { fontSize: SIZES.fontXs, ...FONTS.bold },
  quickLabel: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, marginBottom: 2 },
  quickDesc: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCardSmall: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  statGradSmall: { padding: 14, alignItems: 'center', borderRadius: SIZES.radius },
  statLabel: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold, marginTop: 8 },
  statTarget: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },

  // Extra Stats
  extraStats: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  extraCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1,
  },
  extraIcon: { fontSize: 22, marginBottom: 4 },
  extraValue: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  extraLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },

  // Log Timeline
  logItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  logDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  logInfo: { flex: 1 },
  logTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  logDesc: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  logBadge: { fontSize: SIZES.fontSm, ...FONTS.bold },

  emptyLog: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center' },
  emptyHint: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  // Mood
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  moodBtn: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, flex: 1, marginHorizontal: 3,
  },
  moodBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },

  // Weekly Tab
  weeklySummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  weekStatCard: {
    width: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1,
  },
  weekStatIcon: { fontSize: 22, marginBottom: 4 },
  weekStatValue: { fontSize: SIZES.fontLg, ...FONTS.bold },
  weekStatLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  dayBreakdown: { flexDirection: 'row', alignItems: 'center' },
  dayInfo: { marginRight: 14 },
  dayName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  dayDate: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  dayStats: { flex: 1, flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  dayStat: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  workoutDone: { marginLeft: 8 },

  // ===== MODALS =====
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  inputLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 8, marginTop: 12 },
  inputRow: { flexDirection: 'row' },
  modalInput: {
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium,
  },

  // Walk modal
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  typeKcal: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  previewBox: { backgroundColor: COLORS.success + '10', borderRadius: SIZES.radius, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLORS.success + '30' },
  previewText: { fontSize: SIZES.fontSm, color: COLORS.success, ...FONTS.medium, textAlign: 'center' },

  // Meal modal
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  mealTypeChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  mealTypeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  mealTypeIcon: { fontSize: 18 },
  mealTypeText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  foodDbLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10 },
  foodDbLinkText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.medium },
  mealPreview: { backgroundColor: COLORS.warning + '10', borderRadius: SIZES.radius, padding: 12, marginTop: 8, borderWidth: 1, borderColor: COLORS.warning + '30' },
  mealPreviewText: { fontSize: SIZES.fontSm, color: COLORS.warning, ...FONTS.medium, textAlign: 'center' },

  // Food suggestions
  foodSuggestion: {
    width: 110, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, marginRight: 8,
  },
  foodSugIcon: { fontSize: 24, marginBottom: 4 },
  foodSugName: { fontSize: SIZES.fontXs, color: COLORS.white, ...FONTS.medium, textAlign: 'center' },
  foodSugCal: { fontSize: SIZES.fontXs, color: COLORS.warning, ...FONTS.bold, marginTop: 2 },
  foodSugProtein: { fontSize: 9, color: COLORS.accent, ...FONTS.medium, marginTop: 1 },

  // Sleep modal
  sleepSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  sleepBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  sleepBtnActive: { borderColor: '#9C27B0', backgroundColor: '#9C27B010' },
  sleepBtnText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  sleepTip: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8, marginBottom: 8, textAlign: 'center' },

  // Exercise modal
  exCatChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.darkBorder, marginRight: 8,
  },
  exCatIcon: { fontSize: 14, marginRight: 4 },
  exCatText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  exItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, marginBottom: 8,
  },
  exItemName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  exItemMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  exItemRight: { alignItems: 'flex-end', gap: 4 },
  exItemCal: { fontSize: SIZES.fontSm, ...FONTS.bold },
  exSummary: {
    backgroundColor: COLORS.primary + '10', borderRadius: SIZES.radius, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  exSummaryText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold, marginBottom: 8, textAlign: 'center' },
  exSelectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.darkCard, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
  },
  exSelectedText: { fontSize: SIZES.fontXs, color: COLORS.white, ...FONTS.medium },

  // Weight modal
  weightInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  weightInfoItem: { alignItems: 'center', flex: 1 },
  weightInfoLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 4 },
  weightInfoValue: { fontSize: SIZES.fontLg, ...FONTS.bold },
  weightInfoDivider: { width: 1, height: 30, backgroundColor: COLORS.darkBorder },
  weightDiffBox: { alignItems: 'center', marginTop: 12, paddingVertical: 10 },
  weightDiffText: { fontSize: SIZES.fontMd, ...FONTS.bold },

  // Submit
  submitBtn: { borderRadius: SIZES.radius, overflow: 'hidden', marginTop: 16 },
  submitGrad: { alignItems: 'center', paddingVertical: 14, borderRadius: SIZES.radius },
  submitText: { fontSize: SIZES.fontLg, color: COLORS.onAccent, ...FONTS.bold },

  // Toast
  toastWrap: { position: 'absolute', top: 60, right: 16, left: 16, zIndex: 999, elevation: 999 },
  toastBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.success + '30',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  toastIcon: { fontSize: 24 },
  toastInfo: { flex: 1 },
  toastTitle: { fontSize: SIZES.fontSm, color: COLORS.success, ...FONTS.bold, textTransform: 'capitalize' },
  toastMsg: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium, marginTop: 1 },
});

export default TrackingScreen;
