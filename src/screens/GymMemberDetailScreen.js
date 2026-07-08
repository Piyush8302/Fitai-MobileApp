import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, Platform, KeyboardAvoidingView, RefreshControl, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePickerModal from '../components/DateTimePickerModal';

const PLANS = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: '3 Months', months: 3 },
  { key: 'half_yearly', label: '6 Months', months: 6 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];
const PLAN_LABEL = { trial: 'Trial', day_pass: 'Day Pass', monthly: 'Monthly', quarterly: '3 Months', half_yearly: '6 Months', yearly: 'Yearly' };
// Day-based cycle to match the backend (monthly = join + 30 days, not a calendar month).
const PLAN_DAYS = { monthly: 30, quarterly: 90, half_yearly: 180, yearly: 365 };
const dueForPlan = (planKey) => { const d = new Date(); d.setDate(d.getDate() + (PLAN_DAYS[planKey] || 30)); return d.toISOString(); };
const fmtDue = (v) => {
  if (!v) return 'Not set';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

const GymMemberDetailScreen = ({ navigation, route }) => {
  const { membershipId, gymId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [payPlan, setPayPlan] = useState('monthly');
  const [payAmount, setPayAmount] = useState('');
  const [payDueDate, setPayDueDate] = useState(''); // editable next-due date (ISO)
  const [picker, setPicker] = useState(null); // null | 'pay' | 'edit' — which flow the date picker serves
  const [busy, setBusy] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date()); // month shown in calendar
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await load(); } catch (e) {} setRefreshing(false); };
  // Staff can't remove members (owner only); other actions depend on granted rights.
  const [isStaff, setIsStaff] = useState(false);
  const [perms, setPerms] = useState({});
  useEffect(() => {
    AsyncStorage.getItem('user').then((u) => { try { const p = JSON.parse(u); setIsStaff(p?.role === 'gym_staff'); setPerms(p || {}); } catch (e) {} });
    // Live perms so a freshly-granted right applies without re-login
    api.get(ENDPOINTS.GET_ME).then((me) => { const u = me?.user || me?.data; if (u) { setIsStaff(u.role === 'gym_staff'); setPerms(u); } }).catch(() => {});
  }, []);
  const can = (flag) => !isStaff || !!perms[flag];

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
      if (res.success) {
        Alert.alert(res.data?.duplicate ? 'Already checked in today' : '✅ Marked present', data.membership.user.name);
        load();
      } else {
        Alert.alert('Attendance not marked', res.message || 'Could not mark present.');
      }
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  // Owner / staff (with canAddMember) can edit the member's profile photo.
  const [photoBusy, setPhotoBusy] = useState(false);
  const editPhoto = () => {
    const pick = async (source) => {
      try {
        const perm = source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to update the photo.'); return; }
        const fn = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
        const result = await fn({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
        if (result.canceled || !result.assets?.[0]?.base64) return;
        setPhotoBusy(true);
        const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const res = await api.put(`/api/gym/member/${membershipId}/photo`, { avatar: b64 });
        if (res.success) { await load(); } else Alert.alert('Not updated', res.message || 'Could not update photo');
      } catch (e) { Alert.alert('Error', 'Could not update photo'); }
      finally { setPhotoBusy(false); }
    };
    Alert.alert('Update member photo', 'Choose a source', [
      { text: 'Take photo', onPress: () => pick('camera') },
      { text: 'Choose from gallery', onPress: () => pick('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const markPayment = async () => {
    if (!payAmount || parseInt(payAmount) <= 0) { Alert.alert('Required', 'Enter amount'); return; }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_PAYMENT, { membershipId, amount: parseInt(payAmount), plan: payPlan, dueDate: payDueDate || undefined });
      if (res.success) {
        Alert.alert('✅ Payment marked', `${PLAN_LABEL[payPlan]} • ₹${payAmount}\nNext due: ${new Date(res.data.membership.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
        setShowPay(false);
        load();
      } else {
        Alert.alert('Payment not marked', res.message || 'Could not mark payment.');
      }
    } catch (e) { Alert.alert('Error', 'Failed'); }
    finally { setBusy(false); }
  };

  // Change the next due date WITHOUT a payment (owner grants extra time / fixes a date).
  // Backend notifies the member (app + web) and the owner + staff; reminders follow the new date.
  const applyEditDue = async (dt) => {
    try {
      const res = await api.put(`/api/gym/member/${membershipId}/duedate`, { dueDate: dt.toISOString() });
      if (res.success) { Alert.alert('📅 Due date updated', res.message || `Next due: ${fmtDue(dt)}`); load(); }
      else Alert.alert('Not updated', res.message || 'Failed to update due date');
    } catch (e) { Alert.alert('Error', 'Failed to update due date'); }
  };

  const changeStatus = (status, label, confirm) => {
    const doIt = async () => {
      try {
        const res = await api.put(`/api/gym/member/${membershipId}/status`, { status });
        if (res.success) load();
        else Alert.alert('Error', res.message || 'Failed');
      } catch (e) { Alert.alert('Error', 'Failed to update'); }
    };
    if (confirm) {
      Alert.alert(`Mark ${label}?`, `${data?.membership?.user?.name || 'This member'} will be marked ${label.toLowerCase()}${status !== 'active' ? " and won't be able to check in" : ''}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: status === 'blocked' ? 'destructive' : 'default', onPress: doIt },
      ]);
    } else doIt();
  };

  const confirmDeleteMember = () => {
    Alert.alert('Remove member?', `${data?.membership?.user?.name || 'This member'} will be removed from the gym. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const res = await api.delete(`/api/gym/member/${membershipId}`);
          if (res.success) navigation.goBack();
          else Alert.alert('Error', res.message || 'Failed');
        } catch (e) { Alert.alert('Error', 'Failed to remove'); }
      } },
    ]);
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
  const realEmail = u.email && !/@fitai\.(temp|local)$/.test(u.email) ? u.email : null;
  // Already paid ahead (due date in the future) → block re-marking payment.
  const paidAhead = m.dueDate && new Date(m.dueDate) > new Date() && m.status === 'active';
  const paidTill = m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        {/* Profile */}
        <View style={styles.profile}>
          <TouchableOpacity activeOpacity={can('canAddMember') ? 0.7 : 1} onPress={can('canAddMember') ? editPhoto : undefined} style={styles.avatarWrap}>
            {u.avatar ? (
              <Image source={{ uri: u.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{(u.name || 'M')[0].toUpperCase()}</Text></View>
            )}
            {can('canAddMember') && (
              <View style={styles.avatarEdit}>
                {photoBusy ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={15} color="#FFF" />}
              </View>
            )}
          </TouchableOpacity>
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

        {/* Change due date (no payment) — owner, or staff with mark-payment right */}
        {can('canMarkPayment') && (
          <TouchableOpacity style={styles.editDueBtn} onPress={() => setPicker('edit')}>
            <Ionicons name="calendar" size={16} color={COLORS.primary} />
            <Text style={styles.editDueText}>Change due date</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* Actions — shown per granted rights */}
        {(can('canMarkPresent') || can('canMarkPayment')) && (
          <View style={styles.actions}>
            {can('canMarkPresent') && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success + '15', borderColor: COLORS.success + '40' }]} onPress={markPresent}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={[styles.actionText, { color: COLORS.success }]}>Mark Present</Text>
              </TouchableOpacity>
            )}
            {can('canMarkPayment') && (
              paidAhead ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.success + '15', borderColor: COLORS.success + '40' }]}
                  onPress={() => Alert.alert('Already paid', `This member is paid till ${paidTill}. You can mark the next payment once it's due. Use "Change due date" if you need to adjust.`)}
                >
                  <Ionicons name="checkmark-done-circle" size={20} color={COLORS.success} />
                  <Text style={[styles.actionText, { color: COLORS.success }]}>Paid till {paidTill}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => { setPayDueDate(dueForPlan(payPlan)); setShowPay(true); }}>
                  <Ionicons name="cash" size={20} color={COLORS.onAccent} />
                  <Text style={[styles.actionText, { color: COLORS.onAccent }]}>Mark Payment</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}

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
            <Text>{a.method === 'auto_geo' ? '⚡' : a.method === 'self_scan' ? '📱' : '🧑‍💼'}</Text>
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

        {/* Membership status — owner, or staff granted status rights */}
        {can('canManageStatus') && (() => {
          const st = data?.membership?.status || 'active';
          const STY = {
            active: { c: COLORS.success, t: 'Active' }, inactive: { c: COLORS.warning, t: 'Deactivated' },
            blocked: { c: COLORS.error, t: 'Blocked' }, left: { c: COLORS.textMuted, t: 'Left' },
            expired: { c: COLORS.warning, t: 'Expired' }, frozen: { c: COLORS.accent, t: 'Frozen' },
          }[st] || { c: COLORS.textMuted, t: st };
          return (
            <View style={styles.statusBox}>
              <View style={styles.statusHead}>
                <Text style={styles.statusLabel}>Membership status</Text>
                <View style={[styles.statusPill, { backgroundColor: STY.c + '20', borderColor: STY.c + '55' }]}>
                  <Text style={[styles.statusPillText, { color: STY.c }]}>{STY.t}</Text>
                </View>
              </View>
              <View style={styles.statusBtnRow}>
                {st !== 'active' ? (
                  <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.success + '55' }]} onPress={() => changeStatus('active', 'Active', false)}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                    <Text style={[styles.statusBtnText, { color: COLORS.success }]}>Reactivate</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.warning + '55' }]} onPress={() => changeStatus('inactive', 'Deactivated', true)}>
                      <Ionicons name="pause-circle-outline" size={16} color={COLORS.warning} />
                      <Text style={[styles.statusBtnText, { color: COLORS.warning }]}>Deactivate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.textMuted + '55' }]} onPress={() => changeStatus('left', 'Left', true)}>
                      <Ionicons name="exit-outline" size={16} color={COLORS.textMuted} />
                      <Text style={[styles.statusBtnText, { color: COLORS.textSecondary }]}>Left</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.error + '55' }]} onPress={() => changeStatus('blocked', 'Blocked', true)}>
                      <Ionicons name="ban-outline" size={16} color={COLORS.error} />
                      <Text style={[styles.statusBtnText, { color: COLORS.error }]}>Block</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })()}

        {/* Remove member — owner only (staff blocked) */}
        {!isStaff && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDeleteMember}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            <Text style={styles.deleteText}>Remove Member</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Payment modal */}
      <Modal visible={showPay} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={() => setShowPay(false)}>
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0} style={styles.modalWrap}>
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
                <TouchableOpacity key={p.key} style={[styles.planChip, payPlan === p.key && styles.planChipActive]} onPress={() => { setPayPlan(p.key); setPayDueDate(dueForPlan(p.key)); }}>
                  <Text style={[styles.planChipText, payPlan === p.key && { color: COLORS.onAccent }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Amount received (₹)</Text>
            <TextInput style={styles.input} placeholder="e.g. 1000" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={payAmount} onChangeText={setPayAmount} />

            <Text style={styles.inputLabel}>Next due date</Text>
            <TouchableOpacity style={[styles.input, styles.dateField]} onPress={() => setPicker('pay')}>
              <Text style={{ color: payDueDate ? COLORS.white : COLORS.textMuted, fontSize: SIZES.fontMd, ...FONTS.medium }}>
                {payDueDate ? fmtDue(payDueDate) : 'Tap to pick date & time'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.dueHint}>Auto-set from plan — tap to set a custom due date & time.</Text>

            <TouchableOpacity style={styles.payBtn} onPress={markPayment} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.payBtnText}>Mark as Paid</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date + time picker — serves both the payment due-date and the standalone edit */}
      <DateTimePickerModal
        visible={picker !== null}
        value={picker === 'edit' ? (m?.dueDate || undefined) : (payDueDate || undefined)}
        title={picker === 'edit' ? 'Set next due date' : 'Next due date'}
        onClose={() => setPicker(null)}
        onConfirm={(dt) => {
          const flow = picker;
          setPicker(null);
          if (flow === 'pay') setPayDueDate(dt.toISOString());
          else if (flow === 'edit') applyEditDue(dt);
        }}
      />
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
  avatarWrap: { width: 80, height: 80 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, color: COLORS.onAccent, ...FONTS.bold },
  avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.dark },
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
  statusBox: { marginHorizontal: 16, marginTop: 24, padding: 14, borderRadius: SIZES.radius, backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder },
  statusHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusLabel: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  statusPill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { fontSize: SIZES.fontXs, ...FONTS.bold },
  statusBtnRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: SIZES.radius, borderWidth: 1, backgroundColor: COLORS.darkSurface },
  statusBtnText: { fontSize: SIZES.fontSm, ...FONTS.bold },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, paddingVertical: 14, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '40', backgroundColor: COLORS.error + '10' },
  deleteText: { color: COLORS.error, fontSize: SIZES.fontMd, ...FONTS.bold },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  modalSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4, marginBottom: 16 },
  inputLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.semiBold, marginBottom: 8, marginTop: 8 },
  dueHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4 },
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editDueBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: SIZES.radius, backgroundColor: COLORS.primary + '12', borderWidth: 1, borderColor: COLORS.primary + '30' },
  editDueText: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder },
  planChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  planChipText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  input: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  payBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  payBtnText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
});

export default GymMemberDetailScreen;
