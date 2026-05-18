import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { ONBOARDING_DATA } from '../constants/data';
import GradientButton from '../components/GradientButton';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(_, i) => i.toString()}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {ONBOARDING_DATA.map((_, i) => (
            <View key={i} style={[styles.dot, currentIndex === i && styles.activeDot]} />
          ))}
        </View>

        <GradientButton
          title={currentIndex === ONBOARDING_DATA.length - 1 ? "Get Started" : "Next"}
          onPress={handleNext}
          style={styles.button}
        />

        {currentIndex < ONBOARDING_DATA.length - 1 && (
          <Text onPress={() => navigation.replace('Login')} style={styles.skip}>
            Skip
          </Text>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  icon: { fontSize: 70 },
  title: {
    fontSize: SIZES.fontTitle,
    color: COLORS.white,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: SIZES.fontLg,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 50,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', marginBottom: 30 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.darkBorder,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 32,
    backgroundColor: COLORS.primary,
  },
  button: { width: '100%' },
  skip: {
    fontSize: SIZES.fontMd,
    color: COLORS.textMuted,
    ...FONTS.medium,
    marginTop: 20,
  },
});

export default OnboardingScreen;
