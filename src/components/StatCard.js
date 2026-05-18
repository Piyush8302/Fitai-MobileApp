import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';

const StatCard = ({ icon, title, value, unit, color = COLORS.primary, subtitle }) => (
  <View style={styles.container}>
    <LinearGradient
      colors={[COLORS.darkCard, COLORS.darkSurface]}
      style={styles.gradient}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    ...SHADOWS.small,
  },
  gradient: {
    padding: SIZES.md,
    alignItems: 'center',
    borderRadius: SIZES.radius,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: { fontSize: 20 },
  title: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontSize: SIZES.fontXl, ...FONTS.bold },
  unit: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginLeft: 2, ...FONTS.medium },
  subtitle: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginTop: 4 },
});

export default StatCard;
