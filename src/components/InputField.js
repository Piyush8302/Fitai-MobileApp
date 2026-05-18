import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const InputField = ({ label, icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, error }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, focused && styles.focused, error && styles.errorBorder]}>
        {icon && <Ionicons name={icon} size={20} color={focused ? COLORS.primary : COLORS.textMuted} style={styles.icon} />}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SIZES.md },
  label: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    borderColor: COLORS.darkBorder,
    paddingHorizontal: SIZES.md,
    height: 52,
  },
  focused: { borderColor: COLORS.primary },
  errorBorder: { borderColor: COLORS.error },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    ...FONTS.medium,
  },
  error: { fontSize: SIZES.fontSm, color: COLORS.error, marginTop: 4, ...FONTS.medium },
});

export default InputField;
