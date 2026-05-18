import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { FITNESS_GOALS } from '../constants/data';
import Header from '../components/Header';
import GradientButton from '../components/GradientButton';

const { width } = Dimensions.get('window');

const GoalSelectionScreen = ({ navigation }) => {
  const [selected, setSelected] = useState(null);

  const goalScreens = {
    weight_loss: 'WeightLoss',
    weight_gain: 'WeightGain',
    muscle_build: 'Workout',
    fat_loss: 'WeightLoss',
    height_growth: 'HeightGrowth',
    maintenance: 'Workout',
    home_workout: 'Workout',
    gym_workout: 'GymExercise',
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Choose Your Goal" subtitle="AI will create a personalized plan" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {FITNESS_GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[styles.card, selected === goal.id && { borderColor: goal.color }]}
              onPress={() => setSelected(goal.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[selected === goal.id ? goal.color + '20' : COLORS.darkCard, COLORS.darkSurface]}
                style={styles.cardGrad}
              >
                <View style={[styles.iconCircle, { backgroundColor: goal.color + '20' }]}>
                  <Text style={styles.icon}>{goal.icon}</Text>
                </View>
                <Text style={[styles.title, selected === goal.id && { color: goal.color }]}>{goal.title}</Text>
                <Text style={styles.desc}>{goal.desc}</Text>
                {selected === goal.id && (
                  <View style={[styles.checkCircle, { backgroundColor: goal.color }]}>
                    <Text style={styles.check}>✓</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <GradientButton
          title="Generate AI Plan"
          icon="🤖"
          onPress={() => {
            if (selected) navigation.navigate(goalScreens[selected] || 'Workout');
          }}
          disabled={!selected}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: (width - 44) / 2, borderRadius: SIZES.radiusLg, overflow: 'hidden',
    borderWidth: 1.5, borderColor: COLORS.darkBorder,
  },
  cardGrad: { padding: 20, alignItems: 'center', borderRadius: SIZES.radiusLg, position: 'relative' },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  icon: { fontSize: 30 },
  title: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.semiBold, textAlign: 'center', marginBottom: 4 },
  desc: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textAlign: 'center' },
  checkCircle: {
    position: 'absolute', top: 10, right: 10,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { color: COLORS.white, fontSize: 14, ...FONTS.bold },
  bottom: { paddingHorizontal: 24, paddingBottom: 34, paddingTop: 12, backgroundColor: COLORS.dark },
});

export default GoalSelectionScreen;
