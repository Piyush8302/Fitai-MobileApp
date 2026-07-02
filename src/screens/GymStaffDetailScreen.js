import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput,
  ActivityIndicator, Alert, Modal, Platform, KeyboardAvoidingView, RefreshControl, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api from '../config/api';

const GymStaffDetailScreen = ({ navigation, route }) => {
  const { staff, gymId } = route.params;
  const [s, setS] = useState(staff || {});
  const [att, setAtt] = useState({ thisMonth: 0, count: 0, data: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Owner grants/revokes per-staff permissions (optimistic; s is source of truth)
  const togglePerm = async (key, val) => {
    setS((prev) => ({ ...prev, [key]: val }));
    try {
      const res = await api.put(`/api/gym/staff/${s._id}`, { [key]: val });
      if (!res.success) { setS((prev) => ({ ...prev, [key]: !val })); Alert.alert('Error', res.message || 'Failed to update'); }
    } catch (e) { setS((prev) => ({ ...prev, [key]: !val })); Alert.alert('Error', 'Failed to update'); }
  };
  const changeStaffStatus = (status, label, confirm) => {
    const doIt = async () => {
      const prev = s.staffStatus || 'active';
      setS((p) => ({ ...p, staffStatus: status }));
      try {
        const res = await api.put(`/api/gym/staff/${s._id}`, { staffStatus: status });
        if (!res.success) { setS((p) => ({ ...p, staffStatus: prev })); Alert.alert('Error', res.message || 'Failed'); }
      } catch (e) { setS((p) => ({ ...p, staffStatus: prev })); Alert.alert('Error', 'Failed to update'); }
    };
    if (confirm) {
      Alert.alert(`Mark ${label}?`, `${s.name || 'This staff'} will be marked ${label.toLowerCase()} and won't be able to do anything until reactivated.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: status === 'blocked' ? 'destructive' : 'default', onPress: doIt },
      ]);
    } else doIt();
  };

  const PERMS = [
    { key: 'canMarkPresent', icon: 'checkmark-done-outline', title: 'Mark attendance', sub: 'Scan members & mark them present' },
    { key: 'canAddMember', icon: 'person-add-outline', title: 'Add members', sub: 'Register new members' },
    { key: 'canMarkPayment', icon: 'cash-outline', title: 'Mark payments', sub: 'Record fee payments' },
    { key: 'canManageStatus', icon: 'options-outline', title: 'Manage status', sub: 'Deactivate / block / mark left' },
    { key: 'canAccessCashbook', icon: 'wallet-outline', title: 'Cashbook access', sub: 'View & add income/expense' },
    { key: 'canAccessReports', icon: 'document-text-outline', title: 'Reports access', sub: 'Download PDF reports' },
    { key: 'canEditGym', icon: 'create-outline', title: 'Edit gym', sub: 'Edit name, timings & plans' },
  ];

  // Edit
  const [showEdit, setShowEdit] = useState(false);
  const [eName, setEName] = useState(staff?.name || '');
  const [eRole, setERole] = useState(staff?.staffRole || '');
  const [eSalary, setESalary] = useState(staff?.staffSalary ? String(staff.staffSalary) : '');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/gym/${gymId}/staff/${staff._id}/attendance`);
      if (res.success) setAtt({ thisMonth: res.thisMonth || 0, count: res.count || 0, data: res.data || [] });
    } catch (e) {}
    setLoading(false); setRefreshing(false);
  }, [gymId, staff?._id]);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    if (!eName.trim()) { Alert.alert('Required', 'Enter name'); return; }
    setBusy(true);
    try {
      const res = await api.put(`/api/gym/staff/${s._id}`, { name: eName.trim(), staffRole: eRole.trim(), salary: eSalary });
      if (res.success) {
        setS({ ...s, name: eName.trim(), staffRole: eRole.trim(), staffSalary: eSalary ? Number(eSalary) : undefined });
        setShowEdit(false);
      } else Alert.alert('Error', res.message || 'Failed');
    } catch (e) { Alert.alert('Error', 'Failed to update'); }
    finally { setBusy(false); }
  };

  const confirmDelete = () => {
    Alert.alert('Remove staff?', `${s.name || 'This staff'} will lose gym access. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const res = await api.delete(`/api/gym/staff/${s._id}`);
          if (res.success) navigation.goBack();
          else Alert.alert('Error', res.message || 'Failed');
        } catch (e) { Alert.alert('Error', 'Failed to remove'); }
      } },
    ]);
  };

  if (loading) return <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></LinearGradient>;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Details</Text>
        <TouchableOpacity onPress={() => { setEName(s.name || ''); setERole(s.staffRole || ''); setESalary(s.staffSalary ? String(s.staffSalary) : ''); setShowEdit(true); }} style={styles.backBtn}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        {/* Profile */}
        <View style={styles.profile}>
          {s.avatar && /^(data:|http)/.test(String(s.avatar)) ? (
            <Image source={{ uri: s.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS.accent }]}><Text style={styles.avatarText}>{(s.name || 'S')[0].toUpperCase()}</Text></View>
          )}
          <Text style={styles.name}>{s.name || 'Staff'}</Text>
          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{s.staffRole || 'Staff'}</Text></View>
        </View>

        {/* Info */}
        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.card}>
          <Row icon="call-outline" label="Phone" value={s.phone || '—'} />
          <Row icon="briefcase-outline" label="Role" value={s.staffRole || '—'} />
          <Row icon="cash-outline" label="Salary" value={s.staffSalary ? `₹${s.staffSalary}/mo` : '—'} />
          <Row icon="calendar-outline" label="Joined" value={s.staffJoinDate ? new Date(s.staffJoinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} last />
        </View>

        {/* Staff status — owner can deactivate / block / mark left */}
        {(() => {
          const st = s.staffStatus || 'active';
          const STY = {
            active: { c: COLORS.success, t: 'Active' }, inactive: { c: COLORS.warning, t: 'Deactivated' },
            blocked: { c: COLORS.error, t: 'Blocked' }, left: { c: COLORS.textMuted, t: 'Left' },
          }[st] || { c: COLORS.textMuted, t: st };
          return (
            <>
              <Text style={styles.sectionLabel}>Staff status</Text>
              <View style={styles.card}>
                <View style={styles.statusHead}>
                  <Text style={styles.permTitle}>Account</Text>
                  <View style={[styles.statusPill, { backgroundColor: STY.c + '20', borderColor: STY.c + '55' }]}>
                    <Text style={[styles.statusPillText, { color: STY.c }]}>{STY.t}</Text>
                  </View>
                </View>
                <View style={styles.statusBtnRow}>
                  {st !== 'active' ? (
                    <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.success + '55' }]} onPress={() => changeStaffStatus('active', 'Active', false)}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                      <Text style={[styles.statusBtnText, { color: COLORS.success }]}>Reactivate</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.warning + '55' }]} onPress={() => changeStaffStatus('inactive', 'Deactivated', true)}>
                        <Ionicons name="pause-circle-outline" size={16} color={COLORS.warning} />
                        <Text style={[styles.statusBtnText, { color: COLORS.warning }]}>Deactivate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.textMuted + '55' }]} onPress={() => changeStaffStatus('left', 'Left', true)}>
                        <Ionicons name="exit-outline" size={16} color={COLORS.textMuted} />
                        <Text style={[styles.statusBtnText, { color: COLORS.textSecondary }]}>Left</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.statusBtn, { borderColor: COLORS.error + '55' }]} onPress={() => changeStaffStatus('blocked', 'Blocked', true)}>
                        <Ionicons name="ban-outline" size={16} color={COLORS.error} />
                        <Text style={[styles.statusBtnText, { color: COLORS.error }]}>Block</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </>
          );
        })()}

        {/* Permissions */}
        <Text style={styles.sectionLabel}>Permissions</Text>
        <Text style={styles.permHint}>Turn on only what this staff should be allowed to do. Removing a member stays owner-only.</Text>
        <View style={styles.card}>
          {PERMS.map((p, i) => (
            <View key={p.key} style={[styles.permRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.darkBorder, marginTop: 4, paddingTop: 14 }]}>
              <View style={styles.permIcon}><Ionicons name={p.icon} size={20} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permTitle}>{p.title}</Text>
                <Text style={styles.permSub}>{p.sub}</Text>
              </View>
              <Switch
                value={!!s[p.key]}
                onValueChange={(v) => togglePerm(p.key, v)}
                trackColor={{ false: COLORS.darkBorder, true: COLORS.primary + '70' }}
                thumbColor={s[p.key] ? COLORS.primary : '#FFFFFF'}
              />
            </View>
          ))}
        </View>

        {/* Attendance */}
        <Text style={styles.sectionLabel}>Attendance</Text>
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={styles.statNum}>{att.thisMonth}</Text><Text style={styles.statLabel}>this month</Text></View>
          <View style={styles.statBox}><Text style={styles.statNum}>{att.count}</Text><Text style={styles.statLabel}>total days</Text></View>
        </View>
        {att.data.length === 0 ? (
          <Text style={styles.muted}>No attendance yet</Text>
        ) : att.data.slice(0, 20).map((a) => (
          <View key={a._id} style={styles.histRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.histDate}>{new Date(a.checkInAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            <Text style={styles.histTime}>{new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        ))}

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.deleteText}>Remove Staff</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={showEdit} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Edit Staff</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={COLORS.textMuted} value={eName} onChangeText={setEName} />
            <TextInput style={styles.input} placeholder="Role (e.g. Receptionist)" placeholderTextColor={COLORS.textMuted} value={eRole} onChangeText={setERole} />
            <TextInput style={styles.input} placeholder="Monthly salary ₹" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={eSalary} onChangeText={setESalary} />
            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.saveText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
};

const Row = ({ icon, label, value, last }) => (
  <View style={[rs.row, !last && rs.border]}>
    <Ionicons name={icon} size={18} color={COLORS.textMuted} />
    <Text style={rs.label}>{label}</Text>
    <Text style={rs.value} numberOfLines={1}>{value}</Text>
  </View>
);

const rs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  label: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, width: 90 },
  value: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },

  profile: { alignItems: 'center', marginVertical: 12 },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, color: COLORS.onAccent, ...FONTS.bold },
  name: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginTop: 12 },
  roleBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: COLORS.accent + '20', borderWidth: 1, borderColor: COLORS.accent + '50' },
  roleBadgeText: { fontSize: SIZES.fontSm, color: COLORS.accent, ...FONTS.bold },

  sectionLabel: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold, marginHorizontal: 16, marginTop: 18, marginBottom: 8 },
  card: { marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 4, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  permIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  permSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 1 },
  permHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginHorizontal: 16, marginTop: -4, marginBottom: 8 },
  statusHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusPill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { fontSize: SIZES.fontXs, ...FONTS.bold },
  statusBtnRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: SIZES.radius, borderWidth: 1, backgroundColor: COLORS.darkSurface },
  statusBtnText: { fontSize: SIZES.fontSm, ...FONTS.bold },

  statRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingVertical: 14 },
  statNum: { fontSize: SIZES.fontXl, color: COLORS.primary, ...FONTS.bold },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  muted: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginVertical: 14 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  histDate: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.medium },
  histTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, paddingVertical: 14, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '40', backgroundColor: COLORS.error + '10' },
  deleteText: { color: COLORS.error, fontSize: SIZES.fontMd, ...FONTS.bold },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  input: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium, marginBottom: 10 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
});

export default GymStaffDetailScreen;
