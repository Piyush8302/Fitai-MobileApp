import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';

// Modern centered dialog card (replaces the plain native Alert).
// buttons: [{ label, onPress, variant: 'primary' | 'ghost' | 'danger' }]
const AppDialog = ({ visible, icon = 'information-circle', iconColor, title, message, buttons = [], onRequestClose }) => {
  const accent = iconColor || COLORS.primary;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onRequestClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: accent + '1A' }]}>
            <Ionicons name={icon} size={30} color={accent} />
          </View>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.buttons}>
            {buttons.map((b, i) => {
              const variant = b.variant || (i === 0 ? 'primary' : 'ghost');
              const isPrimary = variant === 'primary';
              const isDanger = variant === 'danger';
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={b.onPress}
                  style={[styles.btn, isPrimary ? styles.btnPrimary : isDanger ? styles.btnDanger : styles.btnGhost]}
                >
                  <Text style={[styles.btnText, isPrimary ? styles.btnTextPrimary : isDanger ? styles.btnTextDanger : styles.btnTextGhost]}>{b.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, backgroundColor: COLORS.darkCard, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.darkBorder, ...SHADOWS.medium },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, textAlign: 'center' },
  message: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  buttons: { width: '100%', marginTop: 22, gap: 10 },
  btn: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnGhost: { backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder },
  btnDanger: { backgroundColor: COLORS.error + '18', borderWidth: 1, borderColor: COLORS.error + '40' },
  btnText: { fontSize: SIZES.fontMd, ...FONTS.bold },
  btnTextPrimary: { color: COLORS.onAccent },
  btnTextGhost: { color: COLORS.textSecondary },
  btnTextDanger: { color: COLORS.error },
});

export default AppDialog;
