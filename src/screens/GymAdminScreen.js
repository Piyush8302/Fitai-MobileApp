import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS, API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLANS = [
  { key: 'trial', label: 'Trial', months: 0 },
  { key: 'day_pass', label: 'Day Pass', months: 0 },
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: '3 Months', months: 3 },
  { key: 'half_yearly', label: '6 Months', months: 6 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];

const GymAdminScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [gyms, setGyms] = useState([]);
  const [activeGym, setActiveGym] = useState(null); // gym object
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState('members'); // members | attendance
  const [memberSearch, setMemberSearch] = useState('');
  const ALL_GYM = { _id: 'ALL', name: '🏢 All Gyms' };
  const isAll = activeGym?._id === 'ALL';

  // Create gym
  const [showCreate, setShowCreate] = useState(false);
  const [gName, setGName] = useState('');
  const [gLoc, setGLoc] = useState('');

  // Add member
  const [showAdd, setShowAdd] = useState(false);
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPlan, setMPlan] = useState('monthly');
  const [mFee, setMFee] = useState('');

  // Payment
  const [payFor, setPayFor] = useState(null); // membership object
  const [payAmount, setPayAmount] = useState('');
  const [payPlan, setPayPlan] = useState('monthly');

  const [attendance, setAttendance] = useState([]);
  const [busy, setBusy] = useState(false);

  // Member attendance history modal
  const [histMember, setHistMember] = useState(null);
  const [histData, setHistData] = useState([]);
  const [histMonth, setHistMonth] = useState(0);
  const [histLoading, setHistLoading] = useState(false);

  const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0];
  const [showGymQR, setShowGymQR] = useState(false);

  // Select a gym AND remember it so every admin tab shows the same gym
  const selectGym = async (gym) => {
    setActiveGym(gym);
    try { await AsyncStorage.setItem('activeGymId', gym._id); } catch (e) {}
  };

  const loadGyms = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const res = await api.get(ENDPOINTS.GYM_MINE);
      if (res.success) {
        setGyms(res.data);
        if (res.data.length === 0) { setShowCreate(true); }
        else {
          // Restore last-selected gym (synced across tabs); 'ALL' = combined view
          const savedId = await AsyncStorage.getItem('activeGymId');
          if (savedId === 'ALL' && res.data.length > 1) { setActiveGym({ _id: 'ALL', name: '🏢 All Gyms' }); }
          else {
            const match = res.data.find(g => g._id === savedId);
            setActiveGym(prev => (prev && (prev._id === 'ALL' || res.data.find(g => g._id === prev._id))) ? prev : (match || res.data[0]));
          }
        }
      }
    } catch (e) { console.log('gyms', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadGyms(); }, [loadGyms]);
  // Re-sync selected gym when this tab regains focus (owner may have switched on another tab)
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

  const loadGymData = useCallback(async (gymId) => {
    if (!gymId) return;
    const isAll = gymId === 'ALL';
    try {
      const [s, m] = await Promise.all([
        api.get(isAll ? '/api/gym/all/dashboard' : `/api/gym/${gymId}/dashboard`),
        api.get(isAll ? '/api/gym/all/members' : `/api/gym/${gymId}/members`),
      ]);
      if (s.success) setStats(s.data);
      if (m.success) setMembers(m.data);
    } catch (e) { console.log('gymdata', e); }
  }, []);

  useEffect(() => { if (activeGym?._id) loadGymData(activeGym._id); }, [activeGym, loadGymData]);
  // Refresh when returning from member detail (payment/attendance may have changed)
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { if (activeGym?._id) loadGymData(activeGym._id); });
    return unsub;
  }, [navigation, activeGym, loadGymData]);

  const loadAttendance = async () => {
    if (!activeGym?._id) return;
    try {
      const res = await api.get(`/api/gym/${activeGym._id}/attendance?day=${istToday()}`);
      if (res.success) setAttendance(res.data);
    } catch (e) {}
  };

  // Open a member's monthly attendance history
  const openHistory = async (member) => {
    setHistMember(member);
    setHistLoading(true);
    setHistData([]);
    try {
      const res = await api.get(`/api/gym/${activeGym._id}/attendance?userId=${member.user._id}`);
      if (res.success) { setHistData(res.data); setHistMonth(res.thisMonth || 0); }
    } catch (e) {}
    finally { setHistLoading(false); }
  };

  // ===== ACTIONS =====
  const createGym = async () => {
    if (!gName.trim()) { Alert.alert('Required', 'Gym name daalo'); return; }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_CREATE, { name: gName.trim(), location: gLoc.trim() });
      if (res.success) {
        setShowCreate(false); setGName(''); setGLoc('');
        await loadGyms();
        selectGym(res.data);
      } else Alert.alert('Error', res.message || 'Failed');
    } catch (e) { Alert.alert('Error', 'Failed to create gym'); }
    finally { setBusy(false); }
  };

  const addMember = async () => {
    if (!mPhone.trim() || mPhone.trim().length < 10) { Alert.alert('Required', 'Valid phone number daalo'); return; }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_ADD_MEMBER, {
        gymId: activeGym._id, name: mName.trim(), phone: mPhone.trim(),
        plan: mPlan, fee: parseInt(mFee) || 0,
      });
      if (res.success) {
        Alert.alert(res.alreadyMember ? 'Already a member' : 'Member added', `${mName || mPhone}`);
        setShowAdd(false); setMName(''); setMPhone(''); setMFee(''); setMPlan('monthly');
        loadGymData(activeGym._id);
      } else Alert.alert('Error', res.message || 'Failed');
    } catch (e) { Alert.alert('Error', 'Failed to add member'); }
    finally { setBusy(false); }
  };

  const markPayment = async () => {
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_PAYMENT, {
        membershipId: payFor._id, amount: parseInt(payAmount) || 0, plan: payPlan,
      });
      if (res.success) {
        Alert.alert('Payment marked ✅', `${payFor.user?.name || 'Member'} • ₹${payAmount}`);
        setPayFor(null); setPayAmount('');
        loadGymData(activeGym._id);
      } else Alert.alert('Error', res.message || 'Failed');
    } catch (e) { Alert.alert('Error', 'Failed to mark payment'); }
    finally { setBusy(false); }
  };

  const markPresent = async (member) => {
    try {
      const gid = member.gym?._id || activeGym._id; // in All-mode use the member's own gym
      const res = await api.post(ENDPOINTS.GYM_ATTENDANCE, { gymId: gid, userId: member.user._id });
      if (res.success) {
        Alert.alert(res.data?.duplicate ? 'Already checked in' : 'Marked present ✅', member.user?.name || '');
        loadGymData(activeGym._id);
      }
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  if (loading) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSmall}>Gym Admin</Text>
          <Text style={styles.headerTitle}>{activeGym?.name || 'My Gym'}</Text>
        </View>
        {!isAll && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.gymQrBtn} onPress={() => setShowGymQR(true)}>
              <Ionicons name="qr-code-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanHeaderBtn} onPress={() => navigation.navigate('GymScan', { mode: 'staff', gymId: activeGym?._id })}>
              <Ionicons name="scan" size={18} color={COLORS.onAccent} />
              <Text style={styles.scanHeaderText}>Scan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Gym switcher (multi-branch) — always shown so "+ Add branch" is available */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.switcher} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
        {gyms.length > 1 && (
          <TouchableOpacity style={[styles.switchChip, isAll && styles.switchChipActive]} onPress={() => selectGym(ALL_GYM)}>
            <Text style={[styles.switchText, isAll && { color: COLORS.onAccent }]}>🏢 All Gyms</Text>
          </TouchableOpacity>
        )}
        {gyms.map((g) => (
          <TouchableOpacity key={g._id} style={[styles.switchChip, activeGym?._id === g._id && styles.switchChipActive]} onPress={() => selectGym(g)}>
            <Text style={[styles.switchText, activeGym?._id === g._id && { color: COLORS.onAccent }]}>{g.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.switchAdd} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={16} color={COLORS.primary} />
          <Text style={styles.switchAddText}>Add Gym</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Members', value: stats?.totalMembers ?? 0, icon: '👥', color: COLORS.primary },
            { label: 'Today In', value: stats?.todayFootfall ?? 0, icon: '✅', color: COLORS.success },
            { label: 'Fee Due', value: stats?.dueMembers ?? 0, icon: '⚠️', color: COLORS.error },
            { label: 'Pending ₹', value: stats?.pendingFees ?? 0, icon: '💰', color: COLORS.warning },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Add member button — disabled in All-Gyms view (which gym to add to?) */}
        {!isAll && (
          <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="person-add" size={18} color={COLORS.onAccent} />
            <Text style={styles.addMemberText}>Add Member</Text>
          </TouchableOpacity>
        )}
        {isAll && (
          <View style={styles.allHint}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.allHintText}>Combined view of all branches. Select a gym to add members or scan.</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {['members', 'attendance'].map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => { setTab(t); if (t === 'attendance') loadAttendance(); }}>
              <Text style={[styles.tabText, tab === t && { color: COLORS.primary }]}>{t === 'members' ? 'Members' : "Today's Attendance"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Members list */}
        {tab === 'members' && (() => {
          const q = memberSearch.trim().toLowerCase();
          const filtered = q
            ? members.filter(m => (m.user?.name || '').toLowerCase().includes(q) || (m.user?.phone || '').includes(q))
            : members;
          return (
          <>
            {/* Search + count */}
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or phone…"
                placeholderTextColor={COLORS.textMuted}
                value={memberSearch}
                onChangeText={setMemberSearch}
              />
              {memberSearch.length > 0 && (
                <TouchableOpacity onPress={() => setMemberSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.countLabel}>
              {q ? `${filtered.length} of ${members.length} members` : `Total ${members.length} member${members.length !== 1 ? 's' : ''}`}
            </Text>
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>{q ? 'No member matched.' : 'No members yet. Tap "Add Member".'}</Text>
            ) : filtered.map((m) => (
            <View key={m._id} style={styles.memberCard}>
              <TouchableOpacity style={styles.memberLeft} onPress={() => navigation.navigate('GymMemberDetail', { membershipId: m._id, gymId: m.gym?._id || activeGym._id })} activeOpacity={0.7}>
                <View style={styles.memberAvatar}><Text style={styles.memberInitial}>{(m.user?.name || 'M')[0].toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.user?.name || 'Member'}</Text>
                  <Text style={styles.memberMeta}>{m.user?.phone} • {m.plan}</Text>
                  {isAll && m.gym?.name && (
                    <View style={styles.gymTag}><Text style={styles.gymTagText}>🏋️ {m.gym.name}</Text></View>
                  )}
                  <Text style={[styles.memberDue, { color: m.isDue ? COLORS.error : COLORS.success }]}>
                    {m.isDue ? '⚠️ Fee due' : m.dueDate ? `Paid till ${new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Active'}
                  </Text>
                  <Text style={styles.viewHistory}>👤 Tap for full details</Text>
                </View>
              </TouchableOpacity>
              <View style={{ gap: 6 }}>
                <TouchableOpacity style={styles.miniBtn} onPress={() => markPresent(m)}>
                  <Ionicons name="checkmark" size={14} color={COLORS.success} />
                  <Text style={[styles.miniBtnText, { color: COLORS.success }]}>Present</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn} onPress={() => { setPayFor(m); setPayAmount(String(m.fee || '')); setPayPlan(m.plan); }}>
                  <Ionicons name="cash" size={14} color={COLORS.warning} />
                  <Text style={[styles.miniBtnText, { color: COLORS.warning }]}>Pay</Text>
                </TouchableOpacity>
              </View>
            </View>
            ))}
          </>
          );
        })()}

        {/* Attendance list */}
        {tab === 'attendance' && (
          attendance.length === 0 ? (
            <Text style={styles.emptyText}>No check-ins today yet.</Text>
          ) : attendance.map((a) => (
            <View key={a._id} style={styles.attRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.attName}>{a.user?.name || 'Member'}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.attTime}>{new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.attDate}>{new Date(a.checkInAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
              </View>
              <Text style={styles.attMethod}>{a.method === 'self_scan' ? '📱' : '🧑‍💼'}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* ===== CREATE GYM MODAL ===== */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => gyms.length && setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{gyms.length ? 'Add New Branch' : 'Create Your Gym'}</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); if (gyms.length === 0) navigation.goBack(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Apne gym ka naam daalo — phir members add kar sakte ho</Text>
            <TextInput style={styles.input} placeholder="Gym name (e.g. Anand Gym)" placeholderTextColor={COLORS.textMuted} value={gName} onChangeText={setGName} />
            <TextInput style={styles.input} placeholder="Location / area (optional)" placeholderTextColor={COLORS.textMuted} value={gLoc} onChangeText={setGLoc} />
            <TouchableOpacity style={styles.primaryBtn} onPress={createGym} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.primaryBtnText}>Create Gym</Text>}
            </TouchableOpacity>
            {gyms.length > 0 && (
              <TouchableOpacity onPress={() => setShowCreate(false)} style={{ paddingVertical: 10 }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== ADD MEMBER MODAL ===== */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={COLORS.textMuted} value={mName} onChangeText={setMName} />
            <TextInput style={styles.input} placeholder="Mobile number" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" value={mPhone} onChangeText={setMPhone} />
            <Text style={styles.inputLabel}>Plan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {PLANS.map((p) => (
                <TouchableOpacity key={p.key} style={[styles.planChip, mPlan === p.key && styles.planChipActive]} onPress={() => setMPlan(p.key)}>
                  <Text style={[styles.planChipText, mPlan === p.key && { color: COLORS.onAccent }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} placeholder="Fee amount (₹)" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={mFee} onChangeText={setMFee} />
            <TouchableOpacity style={styles.primaryBtn} onPress={addMember} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.primaryBtnText}>Add Member</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={{ paddingVertical: 10 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== PAYMENT MODAL ===== */}
      <Modal visible={!!payFor} transparent animationType="slide" onRequestClose={() => setPayFor(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>💵 Mark Payment</Text>
            <Text style={styles.modalSub}>{payFor?.user?.name} • {payFor?.user?.phone}</Text>
            <Text style={styles.inputLabel}>Plan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {PLANS.filter(p => p.months > 0).map((p) => (
                <TouchableOpacity key={p.key} style={[styles.planChip, payPlan === p.key && styles.planChipActive]} onPress={() => setPayPlan(p.key)}>
                  <Text style={[styles.planChipText, payPlan === p.key && { color: COLORS.onAccent }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} placeholder="Amount received (₹)" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={payAmount} onChangeText={setPayAmount} />
            <TouchableOpacity style={styles.primaryBtn} onPress={markPayment} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.primaryBtnText}>Mark as Paid</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPayFor(null)} style={{ paddingVertical: 10 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== MEMBER ATTENDANCE HISTORY MODAL ===== */}
      <Modal visible={!!histMember} transparent animationType="slide" onRequestClose={() => setHistMember(null)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{histMember?.user?.name || 'Member'}</Text>
                <Text style={styles.modalSub}>{histMember?.user?.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => setHistMember(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.histStat}>
              <Text style={styles.histStatNum}>{histMonth}</Text>
              <Text style={styles.histStatLabel}>days this month</Text>
              <View style={styles.histStatDiv} />
              <Text style={styles.histStatNum}>{histData.length}</Text>
              <Text style={styles.histStatLabel}>total check-ins</Text>
            </View>

            {histLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 30 }} />
            ) : histData.length === 0 ? (
              <Text style={styles.emptyText}>No attendance yet</Text>
            ) : (
              <ScrollView style={{ marginTop: 8 }}>
                {histData.map((a) => (
                  <View key={a._id} style={styles.histRow}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.histDate}>
                      {new Date(a.checkInAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={styles.histTime}>{new Date(a.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                    <Text>{a.method === 'self_scan' ? '📱' : '🧑‍💼'}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* ===== GYM QR MODAL (print & display at counter) ===== */}
      <Modal visible={showGymQR} transparent animationType="slide" onRequestClose={() => setShowGymQR(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Gym Check-in QR</Text>
              <TouchableOpacity onPress={() => setShowGymQR(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Members scan this to mark their attendance</Text>

            <View style={styles.gymQrBox}>
              <QRCode value={`${API_BASE_URL}/g/${activeGym?.gymCode || ''}`} size={200} backgroundColor="#FFFFFF" color="#000000" />
              <Text style={styles.gymQrName}>{activeGym?.name}</Text>
              <Text style={styles.gymQrCode}>Code: {activeGym?.gymCode}</Text>
            </View>

            <View style={styles.gymQrTip}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.gymQrTipText}>
                Counter pe print/laga do. **Koi bhi phone** (app ho ya na ho) normal camera se scan kare → naam/phone bhare → register + attendance ho jayega.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  headerSmall: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  headerTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },
  scanHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  scanHeaderText: { color: COLORS.onAccent, fontSize: SIZES.fontSm, ...FONTS.bold },
  gymQrBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '40' },
  gymQrBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 24, marginVertical: 16 },
  gymQrName: { fontSize: SIZES.fontLg, color: '#1B1D33', ...FONTS.bold, marginTop: 14 },
  gymQrCode: { fontSize: SIZES.fontSm, color: '#6B6B8D', ...FONTS.medium, marginTop: 2 },
  gymQrTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.primary + '12', borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.primary + '25', padding: 12 },
  gymQrTipText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 17 },

  switcher: { maxHeight: 44, marginBottom: 8 },
  switchChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder },
  switchChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  switchText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.semiBold },
  switchAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 38, paddingHorizontal: 12, borderRadius: 19, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '40' },
  switchAddText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginTop: 6 },
  statCard: { width: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 16, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: SIZES.fontXxl, ...FONTS.bold },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  addMemberBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14 },
  addMemberText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },

  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 20, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: SIZES.radiusSm },
  tabActive: { backgroundColor: COLORS.primary + '15' },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },

  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginTop: 30, paddingHorizontal: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, paddingHorizontal: 14, height: 46, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  searchInput: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  countLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.semiBold, marginHorizontal: 16, marginTop: 10 },

  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 10, padding: 14, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  memberLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewHistory: { fontSize: SIZES.fontXs, color: COLORS.primary, ...FONTS.medium, marginTop: 3 },
  gymTag: { alignSelf: 'flex-start', backgroundColor: COLORS.accent + '18', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 },
  gymTagText: { fontSize: SIZES.fontXs, color: COLORS.accent, ...FONTS.bold },
  allHint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, padding: 12, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  allHintText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { color: COLORS.onAccent, fontSize: SIZES.fontLg, ...FONTS.bold },
  memberName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  memberMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 1, textTransform: 'capitalize' },
  memberDue: { fontSize: SIZES.fontXs, ...FONTS.medium, marginTop: 2 },
  miniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder },
  miniBtnText: { fontSize: SIZES.fontXs, ...FONTS.bold },

  attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, padding: 12, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  attName: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  attTime: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold },
  attDate: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  attMethod: { fontSize: SIZES.fontMd, marginLeft: 6 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 6 },

  // Attendance history
  histStat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, paddingVertical: 14, marginVertical: 12 },
  histStatNum: { fontSize: SIZES.fontXxl, color: COLORS.primary, ...FONTS.bold },
  histStatLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  histStatDiv: { width: 1, height: 30, backgroundColor: COLORS.darkBorder, marginHorizontal: 12 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  histDate: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.medium },
  histTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  modalSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 16 },
  input: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium, marginBottom: 10 },
  inputLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.semiBold, marginBottom: 8 },
  planChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: COLORS.darkSurface, borderWidth: 1, borderColor: COLORS.darkBorder, marginRight: 8 },
  planChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  planChipText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
  cancelText: { color: COLORS.textMuted, fontSize: SIZES.fontMd, ...FONTS.medium, textAlign: 'center' },
});

export default GymAdminScreen;
