import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';

const PLANS = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: '3 Months', months: 3 },
  { key: 'half_yearly', label: '6 Months', months: 6 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];
const PLAN_LABEL = { trial: 'Trial', day_pass: 'Day Pass', monthly: 'Monthly', quarterly: '3 Months', half_yearly: '6 Months', yearly: 'Yearly' };

const GymMemberDetailScreen = ({ navigation, route }) => {
  const { membershipId, gymId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [payPlan, setPayPlan] = useState('monthly');
  const [payAmount, setPayAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date()); // month shown in calendar

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/gym/${gymId}/member/${membershipId}`);
      if (res.success) {
        setData(res.data);
        setPayPlan(res.data.membership.plan === 'trial' ? 'monthly' : res.data.membership.plan);
        setPayAmount(res.data.membership.fee ? String(res.data.membership.fee) : '');
      }
    } catch (e) {}
    setLoading(false);
  }, [gymId, membershipId]);

  useEffect(() => { load(); }, [load]);

  const markPresent = async () => {
    try {
      const res = await api.post(ENDPOINTS.GYM_ATTENDANCE, { gymId, userId: data.membership.user._id });
      Alert.alert(res.data?.duplicate ? 'Already checked in today' : '✅ Marked present', data.membership.user.name);
      load();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const markPayment = async () => {
    if (!payAmount || parseInt(payAmount) <= 0) { Alert.alert('Required', 'Enter amount'); return; }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_PAYMENT, { membershipId, amount: parseInt(payAmount), plan: payPlan });
      if (res.success) {
        Alert.alert('✅ Payment marked', `${PLAN_LABEL[payPlan]} • ₹${payAmount}\nNext due: ${new Date(res.data.membership.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
        setShowPay(false);
        load();
      }
    } catch (e) { Alert.alert('Error', 'Failed'); }
    finally { setBusy(false); }
  };

  // ===== ATTENDANCE CALENDAR =====
  const pad = (n) => String(n).padStart(2, '0');
  const renderCalendar = () => {
    if (!data) return null;
    const attended = new Set((data.attendance || []).map(a => a.day).filter(Boolean));
    const joinDay = data.membership.joinDate ? new Date(data.membership.joinDate).toISOString().split('T')[0] : null;
    const todayDay = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0];

    const y = calMonth.getFullYear(), mo = calMonth.getMonth();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const startOffset = (new Date(y, mo, 1).getDay() + 6) % 7; // Monday-first
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null); // pad to full weeks
    // Chunk into weeks of 7 so each row always has exactly 7 columns (Sun never wraps)
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const canGoNext = `${y}-${pad(mo + 1)}` < todayDay.slice(0, 7);

    const renderCell = (d, i) => {
      if (d === null) return <View key={i} style={styles.calCell} />;
      const dayStr = `${y}-${pad(mo + 1)}-${pad(d)}`;
      const isPresent = attended.has(dayStr);
      const afterJoin = joinDay && dayStr >= joinDay;
      const isPast = dayStr < todayDay;
      const isToday = dayStr === todayDay;
      let bg = 'transparent', color = COLORS.textMuted;
      if (isPresent) { bg = COLORS.success; color = '#FFF'; }
      else if (afterJoin && isPast) { bg = COLORS.error; color = '#FFF'; } // absent
      else if (isToday) { color = COLORS.primary; }
      return (
        <View key={i} style={styles.calCell}>
          <View style={[styles.calDay, { backgroundColor: bg }, isToday && bg === 'transparent' && styles.calToday]}>
            <Text style={[styles.calDayText, { color }]}>{d}</Text>
          </View>
        </View>
      );
    };

    return (
      <View style={styles.calCard}>
        <View style={styles.calHead}>
          <TouchableOpacity onPress={() => setCalMonth(new Date(y, mo - 1, 1))} style={styles.calArrow}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.calTitle}>{calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity onPress={() => canGoNext && setCalMonth(new Date(y, mo + 1, 1))} style={[styles.calArrow, !canGoNext && { opacity: 0.3 }]} disabled={!canGoNext}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.calWeekRow}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <Text key={i} style={styles.calWeekday}>{w}</Text>)}
        </View>
        <View style={styles.calGrid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.calWeek}>
              {week.map((d, i) => renderCell(d, `${wi}-${i}`))}
            </View>
          ))}
        </View>
        <View style={styles.calLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.success }]} /><Text style={styles.legendText}>Present</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.error }]} /><Text style={styles.legendText}>Absent</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.darkBorder }]} /><Text style={styles.legendText}>Before joining</Text></View>
        </View>
      </View>
    );
  };

  if (loading) return <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></LinearGradient>;
  if (!data) return <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}><Text style={styles.muted}>Member not found</Text></LinearGradient>;

  const m = data.membership;
  const u = m.user;
  const realEmail = u.email && !u.email.endsWith('@fitai.local') ? u.email : null;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile */}
        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(u.name || 'M')[0].toUpperCase()}</Text></View>
          <Text style={styles.name}>{u.name}</Text>
          <View style={[styles.planBadge, m.plan === 'trial' && { backgroundColor: COLORS.warning + '20', borderColor: COLORS.warning + '50' }]}>
            <Text style={[styles.planBadgeText, m.plan === 'trial' && { color: COLORS.warning }]}>{PLAN_LABEL[m.plan] || m.plan}</Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <Row icon="call-outline" label="Phone" value={u.phone || '—'} />
          <Row icon="mail-outline" label="Email" value={realEmail || 'Not provided'} />
          <Row icon="calendar-outline" label="Member since" value={u.createdAt ? new Date(m.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} last />
        </View>

        {/* Membership status */}
        <Text style={styles.sectionLabel}>Membership</Text>
        <View style={styles.card}>
          <Row icon="pricetag-outline" label="Plan" value={PLAN_LABEL[m.plan] || m.plan} />
          <Row icon="cash-outline" label="Fee" value={m.fee ? `₹${m.fee}` : '—'} />
          <Row
            icon={m.isDue ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            label="Status"
            value={m.isDue ? 'Fee Due' : m.dueDate ? `Paid till ${new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Active'}
            valueColor={m.isDue ? COLORS.error : COLORS.success}
            last
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success + '15', borderColor: COLORS.success + '40' }]} onPress={markPresent}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={[styles.actionText, { color: COLORS.success }]}>Mark Present</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowPay(true)}>
            <Ionicons name="cash" size={20} color={COLORS.onAccent} />
            <Text style={[styles.actionText, { color: COLORS.onAccent }]}>Mark Payment</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance summary */}
        <Text style={styles.sectionLabel}>Attendance</Text>
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={styles.statNum}>{data.thisMonth}</Text><Text style={styles.statLabel}>this month</Text></View>
          <View style={styles.statBox}><Text style={styles.statNum}>{data.totalCheckins}</Text><Text style={styles.statLabel}>total check-ins</Text></View>
          <View style={styles.statBox}><Text style={[styles.statNum, { color: COLORS.success }]}>₹{data.totalPaid}</Text><Text style={styles.statLabel}>total paid</Text></View>
        </View>

        {/* ===== ATTENDANCE CALENDAR (green = present, red = absent after joining) ===== */}
        {renderCalendar()}
        {data.attendance.length === 0 ? (
          <Text style={styles.muted}>No check-ins yet</Text>
        ) : data.attendance.slice(0, 15).map((a) => (
          <View key={a._id} style={styles.histRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.histDate}>{new Date(a.checkInAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            <Text style={styles.histTime}>{new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text>{a.method === 'self_scan' ? '📱' : '🧑‍💼'}</Text>
          </View>
        ))}

        {/* Payment history */}
        {data.payments.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Payment History</Text>
            {data.payments.map((p) => (
              <View key={p._id} style={styles.payRow}>
                <Ionicons name="wallet" size={16} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.payAmount}>₹{p.amount} <Text style={styles.payPlan}>· {PLAN_LABEL[p.plan] || p.plan}</Text></Text>
                  <Text style={styles.payDate}>{new Date(p.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Payment modal */}
      <Modal visible={showPay} transparent animationType="slide" onRequestClose={() => setShowPay(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>💵 Mark Payment</Text>
              <TouchableOpacity onPress={() => setShowPay(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>{u.name} • {u.phone}</Text>

            <Text style={styles.inputLabel}>Plan</Text>
            <View style={styles.planGrid}>
              {PLANS.map((p) => (
                <TouchableOpacity key={p.key} style={[styles.planChip, payPlan === p.key && styles.planChipActive]} onPress={() => setPayPlan(p.key)}>
                  <Text style={[styles.planChipText, payPlan === p.key && { color: COLORS.onAccent }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Amount received (₹)</Text>
            <TextInput style={styles.input} placeholder="e.g. 1000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={payAmount} onChangeText={setPayAmount} />

            <TouchableOpacity style={styles.payBtn} onPress={markPayment} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.payBtnText}>Mark as Paid</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
};

const Row = ({ icon, label, value, valueColor, last }) => (
  <View style={[rowStyles.row, !last && rowStyles.border]}>
    <Ionicons name={icon} size={18} color={COLORS.textMuted} />
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[rowStyles.value, valueColor && { color: valueColor }]} numberOfLines={1}>{value}</Text>
  </View>
);

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  label: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, width: 100 },
  value: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  muted: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginVertical: 16 },

  profile: { alignItems: 'center', marginVertical: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, color: COLORS.onAccent, ...FONTS.bold },
  name: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginTop: 12 },
  planBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '50' },
  planBadgeText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },

  sectionLabel: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold, marginHorizontal: 16, marginTop: 18, marginBottom: 8 },
  card: { marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 4, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },

  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: SIZES.radius, borderWidth: 1, borderColor: 'transparent' },
  actionText: { fontSize: SIZES.fontMd, ...FONTS.bold },

  statRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingVertical: 14 },
  statNum: { fontSize: SIZES.fontXl, color: COLORS.primary, ...FONTS.bold },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  // Calendar
  calCard: { marginHorizontal: 16, marginTop: 12, padding: 14, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calArrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '12' },
  calTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  calWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calWeekday: { flex: 1, textAlign: 'center', fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.bold },
  calGrid: {},
  calWeek: { flexDirection: 'row' },
  calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  calDay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  calDayText: { fontSize: SIZES.fontSm, ...FONTS.semiBold },
  calLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },

  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  histDate: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.medium },
  histTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },

  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  payAmount: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  payPlan: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  payDate: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 1 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  modalSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4, marginBottom: 16 },
  inputLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.semiBold, marginBottom: 8, marginTop: 8 },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder },
  planChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  planChipText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  input: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  payBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  payBtnText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
});

export default GymMemberDetailScreen;
