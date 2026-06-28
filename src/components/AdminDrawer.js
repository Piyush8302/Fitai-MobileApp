import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');
const PANEL_W = Math.min(300, width * 0.82);

// Slide-in left drawer for the gym admin UI.
// items: [{ label, icon, color?, danger?, onPress }]
const AdminDrawer = ({ visible, onClose, userName, subtitle, items = [] }) => {
  const tx = useRef(new Animated.Value(-PANEL_W)).current;
  useEffect(() => {
    Animated.timing(tx, { toValue: visible ? 0 : -PANEL_W, duration: 220, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.panel, { transform: [{ translateX: tx }] }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ flex: 1 }}>
            <LinearGradient colors={COLORS.gradient1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
              <View style={styles.avatar}><Ionicons name="business" size={26} color="#FFF" /></View>
              <Text style={styles.name} numberOfLines={1}>{userName || 'Gym Owner'}</Text>
              <Text style={styles.role}>{subtitle || 'Gym Admin'}</Text>
            </LinearGradient>

            <View style={styles.menu}>
              {items.map((it, i) => (
                <TouchableOpacity key={i} style={styles.item} activeOpacity={0.7} onPress={() => { onClose(); setTimeout(() => it.onPress && it.onPress(), 180); }}>
                  <View style={[styles.itemIcon, { backgroundColor: (it.color || COLORS.primary) + '18' }]}>
                    <Ionicons name={it.icon} size={20} color={it.color || COLORS.primary} />
                  </View>
                  <Text style={[styles.itemText, it.danger && { color: COLORS.error }]}>{it.label}</Text>
                  {!it.danger && <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  panel: { width: PANEL_W, height: '100%', backgroundColor: COLORS.darkCard, borderRightWidth: 1, borderRightColor: COLORS.darkBorder },
  header: { paddingTop: 56, paddingBottom: 22, paddingHorizontal: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: SIZES.fontXl, color: '#FFFFFF', ...FONTS.bold, marginTop: 12 },
  role: { fontSize: SIZES.fontSm, color: 'rgba(255,255,255,0.92)', ...FONTS.medium, marginTop: 2 },
  menu: { paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
});

export default AdminDrawer;
