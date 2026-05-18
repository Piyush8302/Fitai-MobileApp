import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';

const GradientButton = ({ title, onPress, colors, style, textStyle, icon, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    style={[styles.container, style]}
  >
    <LinearGradient
      colors={colors || COLORS.gradient1}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.gradient, disabled && styles.disabled]}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: SIZES.radius,
  },
  disabled: { opacity: 0.5 },
  text: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    ...FONTS.bold,
  },
  icon: { fontSize: 20, marginRight: 8 },
});

export default GradientButton;
