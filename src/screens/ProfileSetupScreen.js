import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { GENDER_OPTIONS, ACTIVITY_LEVELS, FITNESS_GOALS } from '../constants/data';
import GradientButton from '../components/GradientButton';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ProfileSetupScreen = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(null);
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [targetWeight, setTargetWeight] = useState(65);
  const [activity, setActivity] = useState(null);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(false);

  const steps = ['Gender', 'Age', 'Body', 'Activity', 'Goal'];

  const saveProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);

      const res = await api.put(ENDPOINTS.UPDATE_PROFILE, {
        gender, age, height, weight, targetWeight,
        activityLevel: activity, fitnessGoal: goal,
      });

      if (res.success) {
        await AsyncStorage.setItem('user', JSON.stringify(res.user));
        navigation.replace('Main');
      } else {
        Alert.alert('Error', res.message || 'Failed to save profile');
      }
    } catch (error) {
      console.log('Profile save error:', error);
      // Navigate anyway if offline
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
                  onPress={() => setGoal(g.id)}
                >
                  <Text style={styles.goalIcon}>{g.icon}</Text>
                  <Text style={[styles.goalTitle, goal === g.id && { color: g.color }]}>{g.title}</Text>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={COLORS.gradient1}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${((step + 1) / steps.length) * 100}%` }]}
          />
        </View>
        <Text style={styles.stepIndicator}>{step + 1}/{steps.length}</Text>
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
          title={loading ? 'Saving...' : step === steps.length - 1 ? "Complete Setup" : "Continue"}
          disabled={loading}
          onPress={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else saveProfile();
          }}
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
