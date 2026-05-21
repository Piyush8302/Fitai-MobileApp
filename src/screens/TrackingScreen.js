import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Modal, TextInput, Platform, AppState, Animated, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import GradientCard from '../components/GradientCard';
import ProgressRing from '../components/ProgressRing';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISES, WORKOUT_CATEGORIES, MEAL_PLAN_SAMPLE } from '../constants/data';

const { width } = Dimensions.get('window');

const TrackingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [tracking, setTracking] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pedometer
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [liveSteps, setLiveSteps] = useState(0);
  const [pedometerActive, setPedometerActive] = useState(false);
  const pedometerSub = useRef(null);
  const lastSyncedSteps = useRef(0);
  const syncTimer = useRef(null);

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

  // Meal form
  const [mealType, setMealType] = useState('lunch');
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProtein, setMealProtein] = useState('');

  // Sleep form
  const [sleepHours, setSleepHours] = useState('7');

  // Exercise form
  const [selectedExCategory, setSelectedExCategory] = useState('chest');
  const [selectedExercises, setSelectedExercises] = useState([]);

  // Weight form
  const [weightInput, setWeightInput] = useState('');

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

  // ===== PEDOMETER SETUP =====
  useEffect(() => {
    const checkPedometer = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(available);
        if (available) {
          // Load today's total steps from device sensor (captures background steps)
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          try {
            const pastSteps = await Pedometer.getStepCountAsync(start, end);
            if (pastSteps && pastSteps.steps > 0) {
              setTracking((prev) => {
                const serverSteps = prev?.steps || 0;
                if (pastSteps.steps > serverSteps) {
                  return { ...prev, steps: pastSteps.steps };
                }
                return prev;
              });
            }
          } catch (e) { console.log('Historical steps fetch error:', e); }

          const savedActive = await AsyncStorage.getItem('pedometerActive');
          if (savedActive === 'true') {
            startPedometer();
          }
        }
      } catch (e) {
        console.log('Pedometer check error:', e);
        setIsPedometerAvailable(false);
      }
    };
    checkPedometer();

    return () => {
      if (pedometerSub.current) pedometerSub.current.remove();
      if (syncTimer.current) clearInterval(syncTimer.current);
    };
  }, []);

  const startPedometer = async () => {
    try {
      if (pedometerSub.current) pedometerSub.current.remove();

      setLiveSteps(0);
      lastSyncedSteps.current = 0;

      pedometerSub.current = Pedometer.watchStepCount((result) => {
        setLiveSteps(result.steps);
      });

      setPedometerActive(true);
      await AsyncStorage.setItem('pedometerActive', 'true');

      if (syncTimer.current) clearInterval(syncTimer.current);
      syncTimer.current = setInterval(() => {
        syncStepsToServer();
      }, 60000);
    } catch (e) {
      console.log('Pedometer start error:', e);
      Alert.alert('Error', 'Could not start step counter. Make sure you have granted motion permissions.');
    }
  };

  const stopPedometer = async () => {
    if (pedometerSub.current) {
      pedometerSub.current.remove();
      pedometerSub.current = null;
    }
    if (syncTimer.current) {
      clearInterval(syncTimer.current);
      syncTimer.current = null;
    }

    await syncStepsToServer();
    setPedometerActive(false);
    setLiveSteps(0);
    lastSyncedSteps.current = 0;
    await AsyncStorage.setItem('pedometerActive', 'false');
  };

  const syncStepsToServer = async () => {
    try {
      setLiveSteps((currentLive) => {
        const newSteps = currentLive - lastSyncedSteps.current;
        if (newSteps > 0) {
          lastSyncedSteps.current = currentLive;
          const calBurned = Math.round(newSteps * 0.04);
          setTracking((prev) => {
            const updatedSteps = (prev?.steps || 0) + newSteps;
            const updatedBurned = (prev?.caloriesBurned || 0) + calBurned;
            api.post(ENDPOINTS.LOG_TRACKING, {
              steps: updatedSteps,
              caloriesBurned: updatedBurned,
            }).catch((e) => console.log('Step sync error:', e));
            return { ...prev, steps: updatedSteps, caloriesBurned: updatedBurned };
          });
        }
        return currentLive;
      });
    } catch (e) {
      console.log('Sync steps error:', e);
    }
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
  const addWater = async () => {
    try {
      const res = await api.post(ENDPOINTS.ADD_WATER, { glasses: 1 });
      if (res.success) {
        setTracking(prev => ({
          ...prev,
          waterIntake: res.data.waterIntake,
        }));
        showToast('💧', 'Water Added', `${(res.data.waterIntake || 0)} glasses total`);
      }
    } catch (e) { console.log('Water error:', e); }
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

    const caloriesPerKm = activityType === 'run' ? 80 : activityType === 'cycle' ? 45 : 55;
    const calBurned = Math.round(km * caloriesPerKm);
    const stepCount = Math.round(km * 1300);

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
        setUserProfile(prev => ({ ...prev, weight: w }));
        showToast('⚖️', 'Weight Updated', `Current weight: ${w} kg`);
        setShowWeightModal(false);
        setWeightInput('');
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

    switch (goal) {
      case 'weight_loss':
        return {
          icon: '🔥', title: 'Weight Loss Mode', color: COLORS.secondary,
          desc: `Target: lose ${diff > 0 ? diff : 5} kg. Eat ${bmr} kcal/day (your BMR) for safe deficit.`,
          targetCalories: bmr, proteinTarget: Math.round(w * 1.6),
          tips: ['Avoid sugary drinks & fried food', 'Eat more protein to stay full', 'Walk 8000+ steps daily'],
        };
      case 'fat_loss':
        return {
          icon: '⚡', title: 'Fat Loss Mode', color: '#FF9800',
          desc: `Target: reduce body fat. Eat ${bmr} kcal/day (your BMR), high protein.`,
          targetCalories: bmr, proteinTarget: Math.round(w * 1.8),
          tips: ['Prioritize protein every meal', 'Do HIIT + weight training', 'Reduce refined carbs & sugar'],
        };
      case 'weight_gain':
        return {
          icon: '💪', title: 'Weight Gain Mode', color: '#4CAF50',
          desc: `Target: gain ${diff > 0 ? diff : 5} kg. Eat ${Math.round(dailyCal * 1.2)} kcal/day (20% surplus).`,
          targetCalories: Math.round(dailyCal * 1.2), proteinTarget: Math.round(w * 1.4),
          tips: ['Eat calorie-dense foods', 'Have 5-6 meals per day', 'Include healthy fats & nuts'],
        };
      case 'muscle_building':
        return {
          icon: '🏋️', title: 'Muscle Building Mode', color: COLORS.primary,
          desc: `Build lean muscle. Eat ${Math.round(dailyCal * 1.15)} kcal/day (15% surplus) with ${Math.round(w * 2.0)}g protein.`,
          targetCalories: Math.round(dailyCal * 1.15), proteinTarget: Math.round(w * 2.0),
          tips: ['Eat 2g protein per kg bodyweight', 'Progressive overload in gym', 'Sleep 7-8 hours for recovery'],
        };
      case 'height_growth':
        return {
          icon: '📏', title: 'Growth & Posture Focus', color: COLORS.accent,
          desc: `Eat ${Math.round(dailyCal * 1.1)} kcal/day (10% surplus). Stretch daily, sleep 8+ hours.`,
          targetCalories: Math.round(dailyCal * 1.1), proteinTarget: Math.round(w * 1.4),
          tips: ['Stretch & hang daily', 'Sleep 8+ hours', 'Eat calcium & vitamin D rich foods'],
        };
      case 'gym_workout':
        return {
          icon: '🏋️', title: 'Gym Performance', color: COLORS.primary,
          desc: `Fuel your workouts with ${Math.round(dailyCal * 1.1)} kcal/day (10% surplus).`,
          targetCalories: Math.round(dailyCal * 1.1), proteinTarget: Math.round(w * 1.6),
          tips: ['Pre & post workout nutrition', 'Stay hydrated during workouts', 'Get enough sleep for recovery'],
        };
      case 'home_workout':
        return {
          icon: '🏠', title: 'Home Workout Mode', color: COLORS.success,
          desc: `Balanced nutrition at ${dailyCal} kcal/day. Consistent bodyweight training.`,
          targetCalories: dailyCal, proteinTarget: Math.round(w * 1.4),
          tips: ['Stay consistent with exercise', 'Focus on bodyweight movements', 'Eat clean & balanced meals'],
        };
      default:
        return {
          icon: '🧘', title: 'Maintain & Stay Fit', color: COLORS.success,
          desc: `Eat ~${dailyCal} kcal/day to maintain your weight with balanced nutrition.`,
          targetCalories: dailyCal, proteinTarget: protein,
          tips: ['Stay consistent with exercise', 'Eat balanced meals', 'Drink 8+ glasses of water'],
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
              <GradientCard colors={[goalInfo.color + '15', '#1A1A2E']} style={{ marginBottom: 16 }}>
                <View style={styles.goalBanner}>
                  <View style={styles.goalBannerHeader}>
                    <Text style={styles.goalBannerIcon}>{goalInfo.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalBannerTitle}>{goalInfo.title}</Text>
                      <Text style={styles.goalBannerDesc}>{goalInfo.desc}</Text>
                    </View>
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
                  </View>
                  {goalInfo.tips.length > 0 && (
                    <View style={styles.goalTips}>
                      {goalInfo.tips.map((tip, i) => (
                        <Text key={i} style={styles.goalTip}>• {tip}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </GradientCard>
            )}

            {/* ===== QUICK ACTIONS (2-column broad cards) ===== */}
            <Text style={styles.sectionTitle}>⚡ Quick Log</Text>
            <View style={styles.quickGrid}>
              {[
                { icon: '🚶', label: 'Walk / Run', desc: `${formatSteps(steps)} steps today`, color: '#4CAF50', onPress: () => setShowWalkModal(true), value: `${burned} kcal burned` },
                { icon: '🍽', label: 'Log Meal', desc: `${meals.length} meal${meals.length !== 1 ? 's' : ''} logged`, color: COLORS.warning, onPress: () => setShowMealModal(true), value: `${cal} / ${calGoal} kcal` },
                { icon: '💧', label: 'Water Intake', desc: `Tap to add 1 glass`, color: COLORS.accent, onPress: addWater, value: `${water} / ${waterGoal} glasses` },
                { icon: '😴', label: 'Log Sleep', desc: sleep > 0 ? `${sleep}h logged today` : 'Not logged yet', color: '#9C27B0', onPress: () => setShowSleepModal(true), value: sleep > 0 ? `${sleep} / ${sleepGoal}h` : '— / 8h' },
                { icon: '🍎', label: 'Food Database', desc: 'Search nutrition info', color: '#FF6B6B', onPress: () => navigation.navigate('FoodDatabase'), value: 'Browse & Log' },
                { icon: '🏋️', label: 'Log Exercise', desc: 'Pick from exercises', color: COLORS.primary, onPress: () => setShowExerciseModal(true), value: `${burned} kcal total` },
                { icon: '⚖️', label: 'Log Weight', desc: `Current: ${userProfile?.weight || '--'} kg`, color: '#607D8B', onPress: () => { setWeightInput(String(userProfile?.weight || '')); setShowWeightModal(true); }, value: `Target: ${userProfile?.targetWeight || '--'} kg` },
                { icon: '🏃', label: 'Gym Guide', desc: 'Learn proper form', color: '#E91E63', onPress: () => navigation.navigate('GymExercise'), value: 'All Exercises' },
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

            {/* ===== LIVE STEP COUNTER ===== */}
            <GradientCard colors={isPedometerAvailable ? ['#4CAF5015', '#1A1A2E'] : ['#F4433615', '#1A1A2E']} style={{ marginBottom: 16 }}>
              <View style={styles.pedometerCard}>
                <View style={styles.pedometerLeft}>
                  <Text style={styles.pedometerEmoji}>{pedometerActive ? '🚶‍♂️' : '📱'}</Text>
                  <View>
                    <Text style={styles.pedometerTitle}>
                      {isPedometerAvailable ? 'Live Step Counter' : 'Step Counter'}
                    </Text>
                    {isPedometerAvailable ? (
                      pedometerActive ? (
                        <Text style={styles.pedometerSub}>
                          +{liveSteps} steps this session | ~{Math.round(liveSteps * 0.04)} kcal
                        </Text>
                      ) : (
                        <Text style={styles.pedometerSub}>Tap Start to auto-count your steps</Text>
                      )
                    ) : (
                      <Text style={[styles.pedometerSub, { color: COLORS.error }]}>Sensor not available on this device</Text>
                    )}
                  </View>
                </View>
                {isPedometerAvailable && (
                  <TouchableOpacity
                    style={[styles.pedometerBtn, pedometerActive && styles.pedometerBtnStop]}
                    onPress={pedometerActive ? stopPedometer : startPedometer}
                  >
                    <Ionicons
                      name={pedometerActive ? 'stop' : 'play'}
                      size={16}
                      color={pedometerActive ? COLORS.error : COLORS.success}
                    />
                    <Text style={[styles.pedometerBtnText, { color: pedometerActive ? COLORS.error : COLORS.success }]}>
                      {pedometerActive ? 'Stop' : 'Start'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {pedometerActive && (
                <View style={styles.liveStepsRow}>
                  <View style={styles.liveStepItem}>
                    <Text style={styles.liveStepValue}>{(tracking?.steps || 0) + liveSteps - (lastSyncedSteps.current || 0)}</Text>
                    <Text style={styles.liveStepLabel}>Total Steps</Text>
                  </View>
                  <View style={styles.liveStepDivider} />
                  <View style={styles.liveStepItem}>
                    <Text style={[styles.liveStepValue, { color: COLORS.success }]}>{((((tracking?.steps || 0) + liveSteps - (lastSyncedSteps.current || 0)) / 1300)).toFixed(1)} km</Text>
                    <Text style={styles.liveStepLabel}>Distance</Text>
                  </View>
                  <View style={styles.liveStepDivider} />
                  <View style={styles.liveStepItem}>
                    <Text style={[styles.liveStepValue, { color: COLORS.warning }]}>{(tracking?.caloriesBurned || 0) + Math.round((liveSteps - (lastSyncedSteps.current || 0)) * 0.04)}</Text>
                    <Text style={styles.liveStepLabel}>Calories</Text>
                  </View>
                </View>
              )}
            </GradientCard>

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

            {/* ===== PROFILE-BASED INFO ===== */}
            {userProfile && (
              <>
                <Text style={styles.sectionTitle}>👤 Your Profile Targets</Text>
                <GradientCard colors={['#6C63FF15', '#1A1A2E']}>
                  <View style={styles.profileGrid}>
                    {[
                      { label: 'Target Calories', value: `${goalInfo.targetCalories} kcal`, icon: '🔥' },
                      { label: 'Protein Need', value: `${goalInfo.proteinTarget}g`, icon: '💪' },
                      { label: 'BMI', value: `${userProfile.bmi || '--'}`, icon: '⚖️' },
                      { label: 'Goal', value: (userProfile.fitnessGoal || 'maintenance').replace(/_/g, ' '), icon: '🎯' },
                      { label: 'Weight', value: `${userProfile.weight || '--'} kg`, icon: '🏋️' },
                      { label: 'Target Wt', value: `${userProfile.targetWeight || '--'} kg`, icon: '📍' },
                    ].map((p, i) => (
                      <View key={i} style={styles.profileItem}>
                        <Text style={styles.profileIcon}>{p.icon}</Text>
                        <Text style={styles.profileValue}>{p.value}</Text>
                        <Text style={styles.profileLabel}>{p.label}</Text>
                      </View>
                    ))}
                  </View>
                </GradientCard>
              </>
            )}

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
                    { key: 'walk', icon: '🚶', label: 'Walk', kcal: '~55 kcal/km' },
                    { key: 'run', icon: '🏃', label: 'Run', kcal: '~80 kcal/km' },
                    { key: 'cycle', icon: '🚴', label: 'Cycle', kcal: '~45 kcal/km' },
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

                {walkKm > 0 && (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewText}>
                      📊 ~{Math.round(parseFloat(walkKm) * 1300)} steps | ~{Math.round(parseFloat(walkKm) * (activityType === 'run' ? 80 : activityType === 'cycle' ? 45 : 55))} kcal burned
                    </Text>
                  </View>
                )}

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

              {/* Quick Food Suggestions */}
              <Text style={styles.inputLabel}>Quick Add</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 90 }}>
                {(MEAL_PLAN_SAMPLE[mealType === 'snack' ? 'snacks' : mealType] || []).map((food, idx) => (
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
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Dal Rice, 2 Roti, Sabzi"
                placeholderTextColor={COLORS.textMuted}
                value={mealName}
                onChangeText={setMealName}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Calories (kcal)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g., 450"
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
                    style={styles.modalInput}
                    placeholder="e.g., 20"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    value={mealProtein}
                    onChangeText={setMealProtein}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.foodDbLink}
                onPress={() => { setShowMealModal(false); navigation.navigate('FoodDatabase'); }}
              >
                <Ionicons name="search" size={16} color={COLORS.primary} />
                <Text style={styles.foodDbLinkText}>Search Food Database for exact nutrition</Text>
              </TouchableOpacity>

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

      {/* Toast Notification */}
      {toast && (
        <Animated.View style={[styles.toastWrap, { transform: [{ translateY: toastAnim }], opacity: toastOpacity }]}>
          <LinearGradient colors={['#1A2E1A', '#1A1A2E']} style={styles.toastBox}>
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
  goalTips: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  goalTip: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 4, lineHeight: 20 },

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

  // Profile Targets
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profileItem: { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 10 },
  profileIcon: { fontSize: 22, marginBottom: 4 },
  profileValue: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, textTransform: 'capitalize' },
  profileLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },

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
  submitText: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },

  // Pedometer
  pedometerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pedometerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pedometerEmoji: { fontSize: 32 },
  pedometerTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  pedometerSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  pedometerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.success + '50', backgroundColor: COLORS.success + '10',
  },
  pedometerBtnStop: { borderColor: COLORS.error + '50', backgroundColor: COLORS.error + '10' },
  pedometerBtnText: { fontSize: SIZES.fontSm, ...FONTS.bold },
  liveStepsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: COLORS.darkBorder,
  },
  liveStepItem: { alignItems: 'center' },
  liveStepValue: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  liveStepLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  liveStepDivider: { width: 1, height: 30, backgroundColor: COLORS.darkBorder },

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
