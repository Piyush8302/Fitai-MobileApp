import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS } from '../constants/theme';

// Circular progress. Pass `gradient={[from, to]}` for the hero rings, or `color`
// for a plain one — existing callers using `color` keep working unchanged.
let gradSeq = 0;

const ProgressRing = ({
  progress = 0,
  size = 80,
  strokeWidth = 8,
  color = COLORS.primary,
  gradient,
  label,
  value,
  valueStyle,
  labelStyle,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  // Each ring needs its own gradient id, else two rings on one screen collide.
  const gradId = React.useMemo(() => `ring${++gradSeq}`, []);
  const stroke = gradient ? `url(#${gradId})` : color;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {gradient && (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        )}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gradient ? COLORS.trackBg : color + '25'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.labelContainer, { width: size, height: size }]}>
        {children || (
          <>
            {value != null && (
              <Text style={[styles.value, { color: gradient ? COLORS.white : color }, valueStyle]}>{value}</Text>
            )}
            {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 16, ...FONTS.bold },
  label: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },
});

export default ProgressRing;
