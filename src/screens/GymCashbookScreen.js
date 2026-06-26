import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Platform, KeyboardAvoidingView, PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const GymCashbookScreen = ({ navigation }) => {
  const [gyms, setGyms] = useState([]);
  const [activeGym, setActiveGym] = useState(null);
  const [monthDate, setMonthDate] = useState(new Date());
  const [data, setData] = useState({ entries: [], income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState('income');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const ALL_GYM = { _id: 'ALL', name: '🏢 All Gyms' };

  const selectGym = async (gym) => {
    setActiveGym(gym);
    try { await AsyncStorage.setItem('activeGymId', gym._id); } catch (e) {}
  };

  // ===== SWIPE LEFT/RIGHT ON SCREEN → switch gym =====
  const swipeRef = useRef({ list: [], activeId: null });
  swipeRef.current = {
    list: [...(gyms.length > 1 ? [ALL_GYM] : []), ...gyms],
    activeId: activeGym?._id,
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_, g) => {
        const { list, activeId } = swipeRef.current;
        if (list.length < 2) return;
        const idx = list.findIndex(x => x._id === activeId);
        if (idx === -1) return;
        let next = idx;
        if (g.dx < -50) next = (idx + 1) % list.length;
        else if (g.dx > 50) next = (idx - 1 + list.length) % list.length;
        if (next !== idx) selectGym(list[next]);
      },
    })
  ).current;

  const loadGyms = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) api.setToken(token);
    try {
      const res = await api.get(ENDPOINTS.GYM_MINE);
      if (res.success) {
        setGyms(res.data);
        if (res.data.length) {
          const savedId = await AsyncStorage.getItem('activeGymId');
          if (savedId === 'ALL' && res.data.length > 1) { setActiveGym({ _id: 'ALL', name: '🏢 All Gyms' }); }
          else {
            const match = res.data.find(g => g._id === savedId);
            setActiveGym(prev => (prev && (prev._id === 'ALL' || res.data.find(g => g._id === prev._id))) ? prev : (match || res.data[0]));
          }
        }
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadGyms(); }, [loadGyms]);
  // Re-sync selected gym when returning to this tab
  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      const savedId = await AsyncStorage.getItem('activeGymId');
      if (savedId && gyms.length) {
        const match = gyms.find(g => g._id === savedId);
        if (match && match._id !== activeGym?._id) setActiveGym(match);
      }
    });
    return unsub;
  }, [navigation, gyms, activeGym]);

  const load = useCallback(async () => {
    if (!activeGym?._id) return;
    const isAll = activeGym._id === 'ALL';
    try {
      const res = await api.get(isAll
        ? `/api/gym/all/cashbook?month=${monthKey(monthDate)}`
        : `/api/gym/${activeGym._id}/cashbook?month=${monthKey(monthDate)}`);
      if (res.success) setData(res.data);
    } catch (e) {}
  }, [activeGym, monthDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const changeMonth = (dir) => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + dir);
    if (d > new Date()) return;
    setMonthDate(d);
  };

  const addEntry = async () => {
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Required', 'Enter amount'); return; }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_CASHBOOK_ADD, {
        gymId: activeGym._id, type: addType, amount: parseFloat(amount), description: desc.trim(),
      });
      if (res.success) { setShowAdd(false); setAmount(''); setDesc(''); load(); }
    } catch (e) { Alert.alert('Error', 'Failed'); }
    finally { setBusy(false); }
  };

  const delEntry = (id) => {
    Alert.alert('Delete entry?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/gym/cashbook/${id}`); load(); } catch (e) {}
      }},
    ]);
  };

  const openAdd = (type) => {
    if (activeGym?._id === 'ALL') { Alert.alert('Select a gym', 'Entries cannot be added in the combined view. Select a specific gym first.'); return; }
    setAddType(type); setAmount(''); setDesc(''); setShowAdd(true);
  };

  if (loading) return <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></LinearGradient>;

  if (!activeGym) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>Create a gym first to use the cashbook.</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container} {...pan.panHandlers}>
      <View style={styles.header}><Text style={styles.headerTitle}>Cashbook</Text></View>

      {gyms.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, marginBottom: 6 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity style={[styles.chip, activeGym?._id === 'ALL' && styles.chipActive]} onPress={() => selectGym({ _id: 'ALL', name: '🏢 All Gyms' })}>
            <Text style={[styles.chipText, activeGym?._id === 'ALL' && { color: COLORS.onAccent }]}>🏢 All Gyms</Text>
          </TouchableOpacity>
          {gyms.map((g) => (
            <TouchableOpacity key={g._id} style={[styles.chip, activeGym?._id === g._id && styles.chipActive]} onPress={() => selectGym(g)}>
              <Text style={[styles.chipText, activeGym?._id === g._id && { color: COLORS.onAccent }]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 200 }}>
        {/* Overview */}
        <Text style={styles.sectionLabel}>Monthly Overview</Text>
        <View style={styles.overview}>
          <View style={styles.ovCard}>
            <Ionicons name="trending-up" size={20} color={COLORS.success} />
            <Text style={[styles.ovValue, { color: COLORS.success }]}>₹{data.income}</Text>
            <Text style={styles.ovLabel}>Income</Text>
          </View>
          <View style={styles.ovCard}>
            <Ionicons name="trending-down" size={20} color={COLORS.error} />
            <Text style={[styles.ovValue, { color: COLORS.error }]}>₹{data.expense}</Text>
            <Text style={styles.ovLabel}>Expense</Text>
          </View>
          <View style={styles.ovCard}>
            <Ionicons name="wallet" size={20} color={COLORS.primary} />
            <Text style={[styles.ovValue, { color: COLORS.primary }]}>₹{data.balance}</Text>
            <Text style={styles.ovLabel}>Balance</Text>
          </View>
        </View>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}><Ionicons name="chevron-back" size={20} color={COLORS.primary} /></TouchableOpacity>
          <Text style={styles.monthText}>{monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}><Ionicons name="chevron-forward" size={20} color={COLORS.primary} /></TouchableOpacity>
        </View>

        {/* Entries */}
        <View style={styles.tableHead}>
          <Text style={[styles.thText, { flex: 1 }]}>Date</Text>
          <Text style={[styles.thText, { flex: 2 }]}>Description</Text>
          <Text style={[styles.thText, { textAlign: 'right' }]}>Amount</Text>
        </View>
        {data.entries.length === 0 ? (
          <Text style={styles.emptyText}>No entries this month. Tap + Income or − Expense.</Text>
        ) : data.entries.map((e) => (
          <TouchableOpacity key={e._id} style={styles.entryRow} onLongPress={() => delEntry(e._id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryDate}>{new Date(e.date).getDate()}</Text>
              <Text style={styles.entryMonth}>{new Date(e.date).toLocaleDateString('en-IN', { month: 'short' })}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.entryDesc} numberOfLines={1}>{e.description || (e.type === 'income' ? 'Income' : 'Expense')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                <Text style={[styles.entryType, { color: e.type === 'income' ? COLORS.success : COLORS.error }]}>{e.type === 'income' ? 'Income' : 'Expense'}</Text>
                {e.source === 'membership' && (
                  <View style={styles.autoBadge}><Text style={styles.autoBadgeText}>AUTO</Text></View>
                )}
                {activeGym?._id === 'ALL' && e.gym?.name && (
                  <Text style={styles.entryGym}>· {e.gym.name}</Text>
                )}
              </View>
            </View>
            <Text style={[styles.entryAmount, { color: e.type === 'income' ? COLORS.success : COLORS.error }]}>
              {e.type === 'income' ? '+' : '−'}₹{e.amount}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom actions — hidden in All-Gyms view (no single gym to add to) and while the Add modal is open */}
      {!showAdd && activeGym?._id !== 'ALL' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => openAdd('income')}>
            <Text style={styles.actionText}>+ Income</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={() => openAdd('expense')}>
            <Text style={styles.actionText}>− Expense</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{addType === 'income' ? '+ Add Income' : '− Add Expense'}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Amount (₹)" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={amount} onChangeText={setAmount} autoFocus />
            <TextInput style={styles.input} placeholder="Description (e.g. membership fee, electricity)" placeholderTextColor={COLORS.textMuted} value={desc} onChangeText={setDesc} />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: addType === 'income' ? COLORS.success : COLORS.error }]} onPress={addEntry} disabled={busy}>
              {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  headerTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },

  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.semiBold },

  sectionLabel: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold, marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  overview: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  ovCard: { flex: 1, alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingVertical: 16 },
  ovValue: { fontSize: SIZES.fontXl, ...FONTS.bold, marginTop: 6 },
  ovLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, padding: 10 },
  monthArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '12' },
  monthText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },

  tableHead: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12, paddingVertical: 8 },
  thText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
  entryRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 12, backgroundColor: COLORS.darkCard, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  entryDate: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  entryMonth: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  entryDesc: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  entryType: { fontSize: SIZES.fontXs, ...FONTS.medium },
  autoBadge: { backgroundColor: COLORS.primary + '20', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  autoBadgeText: { fontSize: 8, color: COLORS.primary, ...FONTS.bold, letterSpacing: 0.5 },
  entryGym: { fontSize: SIZES.fontXs, color: COLORS.accent, ...FONTS.bold },
  entryAmount: { fontSize: SIZES.fontMd, ...FONTS.bold },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginTop: 24, paddingHorizontal: 20 },

  // Sits ABOVE the bottom tab bar (tab bar is 70px tall) — no overlap
  bottomBar: { position: 'absolute', bottom: 78, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.dark, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: SIZES.radius },
  actionText: { color: '#FFF', fontSize: SIZES.fontLg, ...FONTS.bold },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  input: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium, marginBottom: 10 },
  saveBtn: { borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveText: { color: '#FFF', fontSize: SIZES.fontMd, ...FONTS.bold },
});

export default GymCashbookScreen;
