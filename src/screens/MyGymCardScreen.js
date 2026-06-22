import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MyGymCardScreen = ({ navigation }) => {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);       // gymId whose history is open
  const [history, setHistory] = useState({});           // { gymId: [attendance] }

  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const res = await api.get(ENDPOINTS.GYM_MY_CARD);
      if (res.success) setCard(res.data);
    } catch (e) { console.log('card load', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const openHistory = async (gymId) => {
    if (expanded === gymId) { setExpanded(null); return; }
    setExpanded(gymId);
    if (!history[gymId]) {
      try {
        const res = await api.get(`/api/gym/my/${gymId}/attendance`);
        if (res.success) setHistory(prev => ({ ...prev, [gymId]: res.data }));
      } catch (e) {}
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  const qrValue = card?.qrValue || 'FITAI';
  const barcodeValue = (card?.phone || card?.userId || '000000').toString().replace(/\D/g, '').slice(-12) || '000000';

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Gym Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* ===== MEMBERSHIP CARD ===== */}
        <LinearGradient colors={COLORS.gradient1} style={styles.card}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardLabel}>MEMBER</Text>
              <Text style={styles.cardName}>{card?.name || 'Member'}</Text>
              <Text style={styles.cardPhone}>{card?.phone || ''}</Text>
            </View>
            <Ionicons name="barbell" size={28} color={COLORS.onAccent} />
          </View>

          {/* QR */}
          <View style={styles.qrWrap}>
            <QRCode value={qrValue} size={150} backgroundColor="#FFFFFF" color="#000000" />
          </View>
          <Text style={styles.scanHint}>Show this at the gym counter to check in</Text>

          {/* Barcode */}
          <View style={styles.barcodeWrap}>
            <Barcode value={barcodeValue} format="CODE128" height={48} singleBarWidth={1.6} backgroundColor="#FFFFFF" lineColor="#000000" />
          </View>
        </LinearGradient>

        {/* ===== SELF CHECK-IN ===== */}
        <TouchableOpacity
          style={styles.checkinBtn}
          onPress={() => navigation.navigate('GymScan', { mode: 'self' })}
        >
          <Ionicons name="qr-code-outline" size={20} color={COLORS.onAccent} />
          <Text style={styles.checkinText}>Scan Gym QR to Check-in</Text>
        </TouchableOpacity>

        {/* ===== MY GYMS ===== */}
        <Text style={styles.sectionTitle}>My Gyms ({card?.gyms?.length || 0})</Text>
        {(!card?.gyms || card.gyms.length === 0) ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyText}>Not registered at any gym yet</Text>
            <Text style={styles.emptyHint}>Visit a gym & they'll add you, or scan their QR</Text>
          </View>
        ) : card.gyms.map((g) => (
          <View key={g.membershipId} style={styles.gymCard}>
            <TouchableOpacity style={styles.gymRow} onPress={() => openHistory(g.gym?._id)}>
              <View style={styles.gymIcon}><Text style={{ fontSize: 20 }}>🏋️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gymName}>{g.gym?.name || 'Gym'}</Text>
                <Text style={styles.gymMeta}>
                  {g.gym?.location || g.gym?.city || ''} • {g.plan}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.statusDot, { backgroundColor: g.isDue ? COLORS.error : COLORS.success }]} />
                <Text style={[styles.dueText, { color: g.isDue ? COLORS.error : COLORS.textMuted }]}>
                  {g.isDue ? 'Fee Due' : g.dueDate ? `Due ${new Date(g.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Active'}
                </Text>
              </View>
              <Ionicons name={expanded === g.gym?._id ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Attendance history */}
            {expanded === g.gym?._id && (
              <View style={styles.historyBox}>
                {!history[g.gym?._id] ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ paddingVertical: 10 }} />
                ) : history[g.gym?._id].length === 0 ? (
                  <Text style={styles.noHistory}>No check-ins yet</Text>
                ) : (
                  <>
                    <Text style={styles.historyTitle}>{history[g.gym?._id].length} check-ins</Text>
                    {history[g.gym?._id].slice(0, 10).map((a) => (
                      <View key={a._id} style={styles.historyRow}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.historyDate}>
                          {new Date(a.checkInAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </Text>
                        <Text style={styles.historyTime}>
                          {new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.historyMethod}>{a.method === 'self_scan' ? '📱' : '🧑‍💼'}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },

  card: { borderRadius: SIZES.radiusLg, padding: 20, alignItems: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  cardLabel: { fontSize: 10, color: COLORS.onAccent, ...FONTS.bold, letterSpacing: 2, opacity: 0.8 },
  cardName: { fontSize: SIZES.fontXl, color: COLORS.onAccent, ...FONTS.bold, marginTop: 2 },
  cardPhone: { fontSize: SIZES.fontSm, color: COLORS.onAccent, opacity: 0.85, marginTop: 2 },
  qrWrap: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16 },
  scanHint: { fontSize: SIZES.fontXs, color: COLORS.onAccent, opacity: 0.9, marginTop: 10, ...FONTS.medium },
  barcodeWrap: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, marginTop: 14, alignItems: 'center' },

  checkinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, marginTop: 16,
  },
  checkinText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },

  sectionTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginTop: 24, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.semiBold },
  emptyHint: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  gymCard: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, marginBottom: 10, overflow: 'hidden' },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  gymIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  gymName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  gymMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },
  statusDot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-end', marginBottom: 3 },
  dueText: { fontSize: SIZES.fontXs, ...FONTS.medium },

  historyBox: { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  historyTitle: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.bold, marginVertical: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  historyDate: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },
  historyTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  historyMethod: { fontSize: SIZES.fontSm },
  noHistory: { fontSize: SIZES.fontSm, color: COLORS.textMuted, paddingVertical: 10, textAlign: 'center' },
});

export default MyGymCardScreen;
