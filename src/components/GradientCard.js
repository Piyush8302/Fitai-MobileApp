import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';

const GradientCard = ({ children, colors, style, onPress }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.85} style={[styles.container, style]}>
      <LinearGradient
        colors={colors || COLORS.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    ...SHADOWS.small,
  },
  gradient: {
    padding: SIZES.md,
    borderRadius: SIZES.radiusLg,
  },
});

export default GradientCard;
