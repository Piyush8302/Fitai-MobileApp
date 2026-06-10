import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { GENDER_OPTIONS, ACTIVITY_LEVELS, FITNESS_GOALS } from '../constants/data';
import GradientButton from '../components/GradientButton';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const TIMELINE_GOALS = ['weight_loss', 'weight_gain', 'muscle_building', 'fat_loss'];

const ProfileSetupScreen = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(null);
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [targetWeight, setTargetWeight] = useState(65);
  const [activity, setActivity] = useState(null);
  const [goal, setGoal] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);

  const steps = ['Gender', 'Age', 'Body', 'Activity', 'Goal', 'Timeline'];

  const needsTimeline = () => TIMELINE_GOALS.includes(goal);

  // Generate smart timeline options based on goal and weight diff
  const getTimelineOptions = () => {
    const diff = Math.abs(targetWeight - weight);
    if (!diff || diff < 0.5) return [];

    if (goal === 'weight_loss' || goal === 'fat_loss') {
      // Safe rate: 0.5 kg/week = 2 kg/month | Max: 1 kg/week = 4 kg/month
      const rec = Math.max(2, Math.ceil(diff / 2));
      return [
        {
          months: Math.max(1, Math.round(diff / 4)),
          status: 'critical',
          note: `~${(diff / Math.max(1, Math.round(diff / 4))).toFixed(1)} kg/month — Too fast, risks muscle loss & health`,
        },
        {
          months: Math.ceil(diff / 3),
          status: 'aggressive',
          note: `~${(diff / Math.ceil(diff / 3)).toFixed(1)} kg/month — Challenging, strict diet needed`,
        },
        {
          months: rec,
          status: 'recommended',
          note: `~${(diff / rec).toFixed(1)} kg/month — Healthy & sustainable (ideal)`,
        },
        {
          months: rec + Math.max(1, Math.round(rec * 0.5)),
          status: 'comfortable',
          note: `~${(diff / (rec + Math.max(1, Math.round(rec * 0.5)))).toFixed(1)} kg/month — Relaxed, very sustainable`,
        },
      ].filter((o, i, arr) => o.months >= 1 && arr.findIndex(x => x.months === o.months) === i);
    }

    if (goal === 'weight_gain') {
      // Safe rate: 0.3-0.5 kg/week lean gain = 1.5-2 kg/month
      const rec = Math.max(3, Math.ceil(diff / 1.5));
      return [
        {
          months: Math.max(1, Math.round(diff / 3.5)),
          status: 'critical',
          note: `~${(diff / Math.max(1, Math.round(diff / 3.5))).toFixed(1)} kg/month — Too fast, mostly fat gain`,
        },
        {
          months: Math.ceil(diff / 2.5),
          status: 'aggressive',
          note: `~${(diff / Math.ceil(diff / 2.5)).toFixed(1)} kg/month — Fast, some fat gain expected`,
        },
        {
          months: rec,
          status: 'recommended',
          note: `~${(diff / rec).toFixed(1)} kg/month — Lean muscle + weight gain`,
        },
        {
          months: rec + Math.max(2, Math.round(rec * 0.5)),
          status: 'comfortable',
          note: `~${(diff / (rec + Math.max(2, Math.round(rec * 0.5)))).toFixed(1)} kg/month — Very gradual, maximum quality`,
        },
      ].filter((o, i, arr) => o.months >= 1 && arr.findIndex(x => x.months === o.months) === i);
    }

    if (goal === 'muscle_building') {
      const diff2 = diff || 5;
      return [
        { months: 3, status: diff2 > 3 ? 'critical' : 'aggressive', note: 'Very intensive, maximum effort required' },
        { months: 6, status: 'recommended', note: 'Visible muscle definition & strength gains' },
        { months: 9, status: 'comfortable', note: 'Consistent, sustainable progress' },
        { months: 12, status: 'comfortable', note: 'Full transformation with solid foundation' },
      ];
    }

    return [];
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'critical': return { color: '#FF4444', label: '⚠️ Too Fast', bg: '#FF444415' };
      case 'aggressive': return { color: '#FF9800', label: '🔥 Aggressive', bg: '#FF980015' };
      case 'recommended': return { color: '#4CAF50', label: '✅ Recommended', bg: '#4CAF5015' };
      case 'comfortable': return { color: COLORS.accent, label: '😌 Comfortable', bg: COLORS.accent + '15' };
      default: return { color: COLORS.textMuted, label: 'Custom', bg: COLORS.darkBorder };
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);

      const profileData = {
        gender, age, height, weight, targetWeight,
        activityLevel: activity, fitnessGoal: goal,
      };

      if (needsTimeline() && timeline) {
        profileData.goalTimeline = timeline;
        profileData.goalStartDate = new Date().toISOString();
      }

      const res = await api.put(ENDPOINTS.UPDATE_PROFILE, profileData);
      if (res.success) {
        await AsyncStorage.setItem('user', JSON.stringify(res.user));
        navigation.replace('Main');
      } else {
        Alert.alert('Error', res.message || 'Failed to save profile');
      }
    } catch (error) {
      console.log('Profile save error:', error);
      navigation.replace('Main');
    } finally {
      setLoading(false);
    }
  };

  const NumberSelector = ({ value, onChange, min, max, unit, label }) => (
    <View style={styles.numberSelector}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={styles.numberRow}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={styles.numBtn}>
          <Text style={styles.numBtnText}>−</Text>
        </TouchableOpacity>
        <View style={styles.numDisplay}>
          <Text style={styles.numValue}>{value}</Text>
          <Text style={styles.numUnit}>{unit}</Text>
        </View>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={styles.numBtn}>
          <Text style={styles.numBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's your gender?</Text>
            <Text style={styles.stepSubtitle}>This helps us personalize your plan</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.genderCard, gender === g.id && styles.genderCardActive]}
                  onPress={() => setGender(g.id)}
                >
                  <Text style={styles.genderIcon}>{g.icon}</Text>
                  <Text style={[styles.genderLabel, gender === g.id && styles.genderLabelActive]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How old are you?</Text>
            <Text style={styles.stepSubtitle}>Age helps us calculate your needs</Text>
            <NumberSelector value={age} onChange={setAge} min={10} max={80} unit="years" label="Age" />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Body Measurements</Text>
            <Text style={styles.stepSubtitle}>We'll calculate your BMI & calorie needs</Text>
            <NumberSelector value={height} onChange={setHeight} min={100} max={250} unit="cm" label="Height" />
            <NumberSelector value={weight} onChange={setWeight} min={30} max={200} unit="kg" label="Current Weight" />
            <NumberSelector value={targetWeight} onChange={setTargetWeight} min={30} max={200} unit="kg" label="Target Weight" />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Activity Level</Text>
            <Text style={styles.stepSubtitle}>How active are you currently?</Text>
            {ACTIVITY_LEVELS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.activityCard, activity === a.id && styles.activityCardActive]}
                onPress={() => setActivity(a.id)}
              >
                <Text style={styles.activityIcon}>{a.icon}</Text>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityLabel, activity === a.id && styles.activeText]}>{a.label}</Text>
                  <Text style={styles.activityDesc}>{a.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's Your Goal?</Text>
            <Text style={styles.stepSubtitle}>Select your primary fitness goal</Text>
            <View style={styles.goalGrid}>
              {FITNESS_GOALS.slice(0, 6).map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.goalCard, goal === g.id && { borderColor: g.color }]}
                  onPress={() => { setGoal(g.id); setTimeline(null); }}
                >
                  <Text style={styles.goalIcon}>{g.icon}</Text>
                  <Text style={[styles.goalTitle, goal === g.id && { color: g.color }]}>{g.title}</Text>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 5: {
        const diff = Math.abs(targetWeight - weight);
        const options = getTimelineOptions();
        const selectedOption = options.find(o => o.months === timeline);
        const isCritical = selectedOption?.status === 'critical';

        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Set Your Timeline</Text>
            <Text style={styles.stepSubtitle}>
              {diff > 0
                ? `${diff} kg to ${targetWeight > weight ? 'gain' : 'lose'} — choose a realistic deadline`
                : 'How long do you want to achieve your goal?'}
            </Text>

            {/* Warning banner for critical selection */}
            {isCritical && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={20} color="#FF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Health Warning</Text>
                  <Text style={styles.warningText}>
                    This pace is too aggressive and can cause muscle loss, nutritional deficiency, and health risks.
                    We strongly recommend a slower, safer timeline.
                  </Text>
                </View>
              </View>
            )}

            {/* Timeline options */}
            {options.map((opt) => {
              const style = getStatusStyle(opt.status);
              const isSelected = timeline === opt.months;
              return (
                <TouchableOpacity
                  key={opt.months}
                  style={[styles.timelineCard, isSelected && { borderColor: style.color, backgroundColor: style.bg }]}
                  onPress={() => setTimeline(opt.months)}
                  activeOpacity={0.8}
                >
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineMonthBadge, { backgroundColor: style.color + '20' }]}>
                      <Text style={[styles.timelineMonths, { color: style.color }]}>{opt.months}</Text>
                      <Text style={[styles.timelineMonthLabel, { color: style.color }]}>
                        {opt.months === 1 ? 'month' : 'months'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineStatusLabel, { color: style.color }]}>{style.label}</Text>
                      <Text style={styles.timelineNote} numberOfLines={2}>{opt.note}</Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={style.color} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Auto-recommendation info */}
            <View style={styles.timelineInfo}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.timelineInfoText}>
                Based on scientific guidelines: safe weight loss = 0.5–1 kg/week, lean gain = 0.3–0.5 kg/week
              </Text>
            </View>

            {/* Skip button */}
            <TouchableOpacity style={styles.skipBtn} onPress={() => { setTimeline(null); saveProfile(); }}>
              <Text style={styles.skipText}>Skip & use default timeline</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }
  };

  const handleNext = () => {
    if (step === 0 && !gender) {
      Alert.alert('Required', 'Please select your gender to continue');
      return;
    }
    if (step === 3 && !activity) {
      Alert.alert('Required', 'Please select your activity level');
      return;
    }
    if (step === 4 && !goal) {
      Alert.alert('Required', 'Please select your fitness goal');
      return;
    }
    if (step === 4) {
      if (needsTimeline()) {
        setStep(5);
      } else {
        saveProfile();
      }
      return;
    }
    if (step === 5) {
      if (!timeline) {
        Alert.alert('Select Timeline', 'Please select a timeline or tap "Skip" below');
        return;
      }
      saveProfile();
      return;
    }
    setStep(step + 1);
  };

  const totalSteps = needsTimeline() ? steps.length : steps.length - 1;
  const displayStep = step + 1;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={COLORS.gradient1}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${(displayStep / totalSteps) * 100}%` }]}
          />
        </View>
        <Text style={styles.stepIndicator}>{displayStep}/{totalSteps}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={styles.bottomBar}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <GradientButton
          title={loading ? 'Saving...' : (step === 4 && !needsTimeline()) || step === 5 ? 'Complete Setup' : 'Continue'}
          disabled={loading}
          onPress={handleNext}
          style={[styles.nextBtn, step === 0 && { flex: 1 }]}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8,
  },
  progressBar: {
    flex: 1, height: 6, backgroundColor: COLORS.darkBorder,
    borderRadius: 3, overflow: 'hidden', marginRight: 12,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  stepIndicator: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.bold },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  stepContent: {},
  stepTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginBottom: 8 },
  stepSubtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 32 },
  genderRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  genderCard: {
    flex: 1, alignItems: 'center', paddingVertical: 28,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg,
    borderWidth: 2, borderColor: COLORS.darkBorder,
  },
  genderCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  genderIcon: { fontSize: 44, marginBottom: 12 },
  genderLabel: { fontSize: SIZES.fontLg, color: COLORS.textSecondary, ...FONTS.semiBold },
  genderLabelActive: { color: COLORS.primary },
  numberSelector: { marginBottom: 28 },
  numberLabel: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 12 },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  numBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  numBtnText: { fontSize: 24, color: COLORS.primary, ...FONTS.bold },
  numDisplay: { alignItems: 'center', marginHorizontal: 32 },
  numValue: { fontSize: 48, color: COLORS.white, ...FONTS.bold },
  numUnit: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium },
  activityCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, marginBottom: 12,
  },
  activityCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  activityIcon: { fontSize: 28, marginRight: 14 },
  activityInfo: { flex: 1 },
  activityLabel: { fontSize: SIZES.fontLg, color: COLORS.textSecondary, ...FONTS.semiBold },
  activeText: { color: COLORS.primary },
  activityDesc: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: {
    width: (width - 60) / 2, paddingVertical: 20, paddingHorizontal: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg,
    borderWidth: 1.5, borderColor: COLORS.darkBorder, alignItems: 'center',
  },
  goalIcon: { fontSize: 36, marginBottom: 10 },
  goalTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold, textAlign: 'center' },
  goalDesc: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  // Timeline step
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FF444415', borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: '#FF444440',
    padding: 14, marginBottom: 16,
  },
  warningTitle: { fontSize: SIZES.fontMd, color: '#FF4444', ...FONTS.bold, marginBottom: 4 },
  warningText: { fontSize: SIZES.fontSm, color: '#FF4444', ...FONTS.medium, lineHeight: 20 },
  timelineCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, marginBottom: 12,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg,
    borderWidth: 1.5, borderColor: COLORS.darkBorder,
  },
  timelineLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  timelineMonthBadge: {
    width: 60, height: 60, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineMonths: { fontSize: 24, ...FONTS.bold },
  timelineMonthLabel: { fontSize: 10, ...FONTS.medium },
  timelineStatusLabel: { fontSize: SIZES.fontMd, ...FONTS.bold, marginBottom: 4 },
  timelineNote: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, lineHeight: 18 },
  timelineInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, marginTop: 4, marginBottom: 12,
  },
  timelineInfoText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, lineHeight: 18 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },

  bottomBar: {
    flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 34, paddingTop: 12,
    backgroundColor: COLORS.dark, gap: 12,
  },
  backButton: {
    paddingVertical: 16, paddingHorizontal: 24,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  backText: { fontSize: SIZES.fontLg, color: COLORS.textSecondary, ...FONTS.semiBold },
  nextBtn: { flex: 1 },
});

export default ProfileSetupScreen;
