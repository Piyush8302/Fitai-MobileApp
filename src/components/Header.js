import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const Header = ({ title, onBack, rightIcon, onRightPress, subtitle, backIcon }) => (
  <View style={styles.container}>
    <View style={styles.left}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          {backIcon || <Ionicons name="chevron-back" size={24} color={COLORS.white} />}
        </TouchableOpacity>
      )}
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
    {rightIcon && (
      <TouchableOpacity onPress={onRightPress} style={styles.rightBtn}>
        <Ionicons name={rightIcon} size={24} color={COLORS.white} />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingTop: 50,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.dark,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  subtitle: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  rightBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Header;
