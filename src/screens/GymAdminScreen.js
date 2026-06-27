import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Platform, KeyboardAvoidingView, PanResponder, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
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
  const [isStaff, setIsStaff] = useState(false); // gym_staff → restricted UI
  useEffect(() => {
    AsyncStorage.getItem('user').then(u => { try { setIsStaff(JSON.parse(u)?.role === 'gym_staff'); } catch (e) {} });
  }, []);

  // Create gym
  const [showCreate, setShowCreate] = useState(false);
  const [gName, setGName] = useState('');
  const [gLoc, setGLoc] = useState('');
  const [gOwnerPhone, setGOwnerPhone] = useState(''); // required when creating the FIRST gym

  // Add member
  const [showAdd, setShowAdd] = useState(false);
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPlan, setMPlan] = useState('monthly');
  const [mFee, setMFee] = useState('');
  const [mPhoto, setMPhoto] = useState(''); // base64 data URI
  const [showPhotoSheet, setShowPhotoSheet] = useState(false); // modern photo-source picker
  const [photoFor, setPhotoFor] = useState('member'); // which form the photo sheet feeds: 'member' | 'staff'

  // Staff
  const [staff, setStaff] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sRole, setSRole] = useState('');
  const [sSalary, setSSalary] = useState('');
  const [sPhoto, setSPhoto] = useState('');

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
  const [qrUrl, setQrUrl] = useState('');        // rotating, encrypted, ~4-min check-in URL
  const [hasUnread, setHasUnread] = useState(false); // gym-admin notifications unread dot

  // Fetch a fresh time-limited check-in token; auto-refresh while the QR modal is open
  const loadCheckinQR = useCallback(async () => {
    if (!activeGym?._id || activeGym._id === 'ALL') return;
    try {
      const res = await api.get(`/api/gym/${activeGym._id}/checkin-token`);
      if (res.success) setQrUrl(res.data.url);
    } catch (e) {}
  }, [activeGym]);

  useEffect(() => {
    if (!showGymQR) { setQrUrl(''); return; }
    loadCheckinQR();
    const id = setInterval(loadCheckinQR, 180000); // refresh ~every 3 min (before 4-min expiry)
    return () => clearInterval(id);
  }, [showGymQR, loadCheckinQR]);

  // Open the always-on counter display (auto-refreshing QR) on this/another screen
  const openCounterDisplay = async () => {
    if (!activeGym?._id || activeGym._id === 'ALL') return;
    try {
      const res = await api.get(`/api/gym/${activeGym._id}/kiosk-link`);
      if (res.success && res.data?.url) Linking.openURL(res.data.url);
      else Alert.alert('Error', 'Could not open the counter display');
    } catch (e) { Alert.alert('Error', 'Could not open the counter display'); }
  };

  const loadUnread = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.NOTIFICATIONS);
      if (res.success) setHasUnread(res.data.some(n => n.data?.screen === 'GymAdmin' && !n.isRead));
    } catch (e) {}
  }, []);
  // Refresh the unread dot on mount and whenever the screen regains focus
  useEffect(() => {
    loadUnread();
    const unsub = navigation.addListener('focus', loadUnread);
    return unsub;
  }, [navigation, loadUnread]);

  // Select a gym AND remember it so every admin tab shows the same gym
  const selectGym = async (gym) => {
    setActiveGym(gym);
    try { await AsyncStorage.setItem('activeGymId', gym._id); } catch (e) {}
  };

  // ===== SWIPE LEFT/RIGHT ON SCREEN → switch gym =====
  // Keep latest list/active in a ref so the once-created PanResponder isn't stale.
  const swipeRef = useRef({ list: [], activeId: null });
  swipeRef.current = {
    list: [...(gyms.length > 1 ? [ALL_GYM] : []), ...gyms],
    activeId: activeGym?._id,
  };
  const pan = useRef(
    PanResponder.create({
      // Only claim clearly-horizontal swipes; vertical scroll & chip scroll stay untouched
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_, g) => {
        const { list, activeId } = swipeRef.current;
        if (list.length < 2) return;
        const idx = list.findIndex(x => x._id === activeId);
        if (idx === -1) return;
        let next = idx;
        if (g.dx < -50) next = (idx + 1) % list.length;                 // swipe left → next gym
        else if (g.dx > 50) next = (idx - 1 + list.length) % list.length; // swipe right → prev gym
        if (next !== idx) selectGym(list[next]);
      },
    })
  ).current;

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
  // Reload staff when the selected gym changes while the Staff tab is open
  useEffect(() => { if (tab === 'staff' && activeGym?._id && !isAll) loadStaff(); }, [activeGym?._id]);
  // Staff tab doesn't exist in All-Gyms view — fall back to Members
  useEffect(() => { if (isAll && tab === 'staff') setTab('members'); }, [isAll]);
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

  // Clean exit for someone who opened admin but isn't a gym owner (clears session)
  const logoutToLogin = async () => {
    try { await AsyncStorage.multiRemove(['token', 'user', 'loginRole', 'activeGymId']); } catch (e) {}
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // ===== ACTIONS =====
  const createGym = async () => {
    if (!gName.trim()) { Alert.alert('Required', 'Enter gym name'); return; }
    // First gym → owner becomes a gym_owner, so a mobile number is mandatory
    if (gyms.length === 0 && (!gOwnerPhone.trim() || gOwnerPhone.trim().length < 10)) {
      Alert.alert('Mobile number required', 'Enter your 10-digit mobile number to create your gym.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_CREATE, { name: gName.trim(), location: gLoc.trim(), ownerPhone: gOwnerPhone.trim() });
      if (res.success) {
        setShowCreate(false); setGName(''); setGLoc(''); setGOwnerPhone('');
        await loadGyms();
        selectGym(res.data);
      } else Alert.alert('Error', res.message || 'Failed');
    } catch (e) { Alert.alert('Error', 'Failed to create gym'); }
    finally { setBusy(false); }
  };

  // Pick a photo — open the modern source-picker sheet (shared by member & staff forms)
  const pickMemberPhoto = () => { setPhotoFor('member'); setShowPhotoSheet(true); };
  const pickStaffPhoto = () => { setPhotoFor('staff'); setShowPhotoSheet(true); };

  const grabPhoto = async (source) => {
    setShowPhotoSheet(false);
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', `Allow ${source} access in Settings.`); return; }
      const fn = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await fn({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
      if (!result.canceled && result.assets?.[0]?.base64) {
        const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (photoFor === 'staff') setSPhoto(uri); else setMPhoto(uri);
      }
    } catch (e) { Alert.alert('Error', 'Could not get photo'); }
  };

  // ===== STAFF =====
  const loadStaff = async () => {
    if (!activeGym?._id || isAll) return;
    try {
      const res = await api.get(`/api/gym/${activeGym._id}/staff`);
      if (res.success) setStaff(res.data);
    } catch (e) {}
  };

  const addStaff = async () => {
    if (!sPhone.trim() || sPhone.trim().length < 10) { Alert.alert('Required', 'Enter a valid phone number'); return; }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_ADD_STAFF, {
        gymId: activeGym._id, name: sName.trim(), phone: sPhone.trim(),
        staffRole: sRole.trim(), salary: parseInt(sSalary) || undefined, avatar: sPhoto || undefined,
      });
      if (res.success) {
        Alert.alert('Staff added ✅', sName || sPhone);
        setShowAddStaff(false); setSName(''); setSPhone(''); setSRole(''); setSSalary(''); setSPhoto('');
        loadStaff();
      } else Alert.alert('Error', res.message || 'Failed to add staff');
    } catch (e) { Alert.alert('Error', 'Failed to add staff'); }
    finally { setBusy(false); }
  };

  const markStaffPresent = async (s) => {
    try {
      const res = await api.post(ENDPOINTS.GYM_STAFF_ATTENDANCE, { gymId: activeGym._id, staffId: s._id });
      if (res.success) {
        Alert.alert(res.data?.duplicate ? 'Already present' : 'Marked present ✅', s.name || 'Staff');
        loadStaff();
      } else Alert.alert('Error', res.message || 'Failed');
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const removeStaff = (s) => {
    Alert.alert('Remove staff?', `${s.name || 'This staff'} will lose gym access.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const res = await api.delete(`${ENDPOINTS.GYM_STAFF_REMOVE}/${s._id}`);
          if (res.success) loadStaff();
          else Alert.alert('Error', res.message || 'Failed');
        } catch (e) { Alert.alert('Error', 'Failed'); }
      }},
    ]);
  };

  const addMember = async () => {
    if (!mPhone.trim() || mPhone.trim().length < 10) { Alert.alert('Required', 'Enter a valid phone number'); return; }
    setBusy(true);
    try {
      const res = await api.post(ENDPOINTS.GYM_ADD_MEMBER, {
        gymId: activeGym._id, name: mName.trim(), phone: mPhone.trim(),
        plan: mPlan, fee: parseInt(mFee) || 0, avatar: mPhoto || undefined,
      });
      if (res.success) {
        Alert.alert(res.alreadyMember ? 'Already a member' : 'Member added', `${mName || mPhone}`);
        setShowAdd(false); setMName(''); setMPhone(''); setMFee(''); setMPlan('monthly'); setMPhoto('');
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
    <LinearGradient colors={COLORS.gradientDark} style={styles.container} {...pan.panHandlers}>
      {/* Header */}
      <View style={styles.header}>
        {/* Top row: label + action buttons */}
        <View style={styles.headerTopRow}>
          <Text style={styles.headerSmall}>Gym Admin</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={styles.gymQrBtn} onPress={() => navigation.navigate('Notifications', { scope: 'gym' })}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
              {hasUnread && <View style={styles.notifBadge} />}
            </TouchableOpacity>
            {!isAll && (
              <>
                <TouchableOpacity style={styles.gymQrBtn} onPress={() => setShowGymQR(true)}>
                  <Ionicons name="qr-code-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanHeaderBtn} onPress={() => navigation.navigate('GymScan', { mode: 'staff', gymId: activeGym?._id })}>
                  <Ionicons name="scan" size={18} color={COLORS.onAccent} />
                  <Text style={styles.scanHeaderText}>Scan</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        {/* Gym name on its own full-width line below */}
        <Text style={styles.headerTitle} numberOfLines={1}>{activeGym?.name || 'My Gym'}</Text>
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
        {!isStaff && (
          <TouchableOpacity style={styles.switchAdd} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.switchAddText}>Add Gym</Text>
          </TouchableOpacity>
        )}
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
          {['members', 'attendance', ...((isAll || isStaff) ? [] : ['staff'])].map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => { setTab(t); if (t === 'attendance') loadAttendance(); if (t === 'staff') loadStaff(); }}>
              <Text style={[styles.tabText, tab === t && { color: COLORS.primary }]}>{t === 'members' ? 'Members' : t === 'attendance' ? 'Attendance' : 'Staff'}</Text>
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
                {m.user?.avatar && m.user.avatar.startsWith('data:') ? (
                  <Image source={{ uri: m.user.avatar }} style={styles.memberAvatar} />
                ) : (
                  <View style={styles.memberAvatar}><Text style={styles.memberInitial}>{(m.user?.name || 'M')[0].toUpperCase()}</Text></View>
                )}
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

        {/* Staff list */}
        {tab === 'staff' && !isAll && (
          <>
            <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddStaff(true)}>
              <Ionicons name="people" size={18} color={COLORS.onAccent} />
              <Text style={styles.addMemberText}>Add Staff</Text>
            </TouchableOpacity>
            <Text style={styles.countLabel}>{staff.length} staff • mark them present at the reception</Text>
            {staff.length === 0 ? (
              <Text style={styles.emptyText}>No staff yet. Tap "Add Staff" to add your receptionist or trainers.</Text>
            ) : staff.map((s) => (
              <View key={s._id} style={styles.memberCard}>
                <View style={styles.memberLeft}>
                  {s.avatar && s.avatar.startsWith('data:') ? (
                    <Image source={{ uri: s.avatar }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatar, { backgroundColor: COLORS.accent }]}><Text style={styles.memberInitial}>{(s.name || 'S')[0].toUpperCase()}</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{s.name || 'Staff'}</Text>
                    <Text style={styles.memberMeta}>{s.phone}{s.staffRole ? ` • ${s.staffRole}` : ''}</Text>
                    {s.staffSalary ? <Text style={styles.memberMeta}>💰 ₹{s.staffSalary}/mo</Text> : null}
                    <Text style={[styles.memberDue, { color: s.presentToday ? COLORS.success : COLORS.textMuted }]}>
                      {s.presentToday
                        ? `✅ Present today${s.checkInAt ? ` • ${new Date(s.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                        : '⚪ Not marked today'}
                    </Text>
                    <Text style={styles.viewHistory}>📅 {s.monthCount} days this month</Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => markStaffPresent(s)} disabled={s.presentToday}>
                    <Ionicons name="checkmark" size={14} color={s.presentToday ? COLORS.textMuted : COLORS.success} />
                    <Text style={[styles.miniBtnText, { color: s.presentToday ? COLORS.textMuted : COLORS.success }]}>{s.presentToday ? 'Done' : 'Present'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => removeStaff(s)}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                    <Text style={[styles.miniBtnText, { color: COLORS.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ===== CREATE GYM MODAL ===== */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => gyms.length && setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{gyms.length ? 'Add New Branch' : 'Create Your Gym'}</Text>
              {/* No close cross on the FIRST gym — a gym is mandatory to use admin */}
              {gyms.length > 0 && (
                <TouchableOpacity onPress={() => setShowCreate(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.modalSub}>Enter your gym name — then you can add members</Text>
            <TextInput style={styles.input} placeholder="Gym name (e.g. Anand Gym)" placeholderTextColor={COLORS.textMuted} value={gName} onChangeText={setGName} />
            <TextInput style={styles.input} placeholder="Location / area (optional)" placeholderTextColor={COLORS.textMuted} value={gLoc} onChangeText={setGLoc} />
            {gyms.length === 0 && (
              <TextInput style={styles.input} placeholder="Your mobile number (required)" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" maxLength={10} value={gOwnerPhone} onChangeText={setGOwnerPhone} />
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={createGym} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.primaryBtnText}>Create Gym</Text>}
            </TouchableOpacity>
            {gyms.length > 0 ? (
              <TouchableOpacity onPress={() => setShowCreate(false)} style={{ paddingVertical: 10 }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={logoutToLogin} style={{ paddingVertical: 10 }}>
                <Text style={styles.cancelText}>Not a gym owner? Logout</Text>
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
            {/* Photo picker — camera or gallery */}
            <TouchableOpacity style={styles.photoPick} onPress={pickMemberPhoto}>
              {mPhoto ? (
                <Image source={{ uri: mPhoto }} style={styles.photoImg} />
              ) : (
                <View style={styles.photoPlaceholder}><Ionicons name="camera" size={26} color={COLORS.primary} /></View>
              )}
              <Text style={styles.photoText}>{mPhoto ? 'Change photo' : 'Add photo (optional)'}</Text>
            </TouchableOpacity>
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

      {/* ===== ADD STAFF MODAL ===== */}
      <Modal visible={showAddStaff} transparent animationType="slide" onRequestClose={() => setShowAddStaff(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Staff</Text>
            <Text style={styles.modalSub}>Receptionist, trainer or helper — they can be marked present daily</Text>
            {/* Photo picker — camera or gallery */}
            <TouchableOpacity style={styles.photoPick} onPress={pickStaffPhoto}>
              {sPhoto ? (
                <Image source={{ uri: sPhoto }} style={styles.photoImg} />
              ) : (
                <View style={styles.photoPlaceholder}><Ionicons name="camera" size={26} color={COLORS.primary} /></View>
              )}
              <Text style={styles.photoText}>{sPhoto ? 'Change photo' : 'Add photo (optional)'}</Text>
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={COLORS.textMuted} value={sName} onChangeText={setSName} />
            <TextInput style={styles.input} placeholder="Mobile number" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" value={sPhone} onChangeText={setSPhone} />
            <TextInput style={styles.input} placeholder="Role (e.g. Receptionist, Trainer)" placeholderTextColor={COLORS.textMuted} value={sRole} onChangeText={setSRole} />
            <TextInput style={styles.input} placeholder="Monthly salary ₹ (optional)" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" value={sSalary} onChangeText={setSSalary} />
            <TouchableOpacity style={styles.primaryBtn} onPress={addStaff} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.primaryBtnText}>Add Staff</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddStaff(false)} style={{ paddingVertical: 10 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== PHOTO SOURCE PICKER (modern bottom sheet) ===== */}
      <Modal visible={showPhotoSheet} transparent animationType="fade" onRequestClose={() => setShowPhotoSheet(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.sheetBackdrop} onPress={() => setShowPhotoSheet(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Member Photo</Text>
            <Text style={styles.sheetSub}>Choose how you want to add a photo</Text>

            <View style={styles.sheetOptions}>
              <TouchableOpacity style={styles.sheetOption} onPress={() => grabPhoto('camera')} activeOpacity={0.85}>
                <View style={[styles.sheetIconWrap, { backgroundColor: COLORS.primary + '18' }]}>
                  <Ionicons name="camera" size={26} color={COLORS.primary} />
                </View>
                <Text style={styles.sheetOptionText}>Camera</Text>
                <Text style={styles.sheetOptionHint}>Take a new photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetOption} onPress={() => grabPhoto('gallery')} activeOpacity={0.85}>
                <View style={[styles.sheetIconWrap, { backgroundColor: COLORS.accent + '18' }]}>
                  <Ionicons name="images" size={26} color={COLORS.accent} />
                </View>
                <Text style={styles.sheetOptionText}>Gallery</Text>
                <Text style={styles.sheetOptionHint}>Pick from photos</Text>
              </TouchableOpacity>
            </View>

            {(photoFor === 'staff' ? sPhoto : mPhoto) ? (
              <TouchableOpacity style={styles.sheetRemove} onPress={() => { photoFor === 'staff' ? setSPhoto('') : setMPhoto(''); setShowPhotoSheet(false); }} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                <Text style={styles.sheetRemoveText}>Remove current photo</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPhotoSheet(false)} activeOpacity={0.85}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
            <Text style={styles.modalSub}>Members scan this live QR to mark attendance</Text>

            <View style={styles.gymQrBox}>
              {qrUrl ? (
                <QRCode value={qrUrl} size={200} backgroundColor="#FFFFFF" color="#000000" />
              ) : (
                <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              )}
              <Text style={styles.gymQrName}>{activeGym?.name}</Text>
              <Text style={styles.gymQrCode}>🔄 Refreshes automatically</Text>
            </View>

            <View style={styles.gymQrTip}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.gymQrTipText}>
                The QR expires in ~4 min so it can't be saved & reused from home. Best: open the counter display on a screen/tablet — it keeps refreshing the QR by itself.
              </Text>
            </View>

            <TouchableOpacity style={styles.kioskBtn} onPress={openCounterDisplay}>
              <Ionicons name="tv-outline" size={18} color={COLORS.onAccent} />
              <Text style={styles.kioskBtnText}>Open counter display</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSmall: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  headerTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginTop: 4 },
  scanHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  scanHeaderText: { color: COLORS.onAccent, fontSize: SIZES.fontSm, ...FONTS.bold },
  gymQrBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '40' },
  notifBadge: { position: 'absolute', top: 7, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.error, borderWidth: 1.5, borderColor: COLORS.darkCard },
  gymQrBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 24, marginVertical: 16 },
  gymQrName: { fontSize: SIZES.fontLg, color: '#1B1D33', ...FONTS.bold, marginTop: 14 },
  gymQrCode: { fontSize: SIZES.fontSm, color: '#6B6B8D', ...FONTS.medium, marginTop: 2 },
  gymQrTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.primary + '12', borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.primary + '25', padding: 12 },
  gymQrTipText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 17 },
  kioskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 14, borderRadius: SIZES.radius, backgroundColor: COLORS.primary },
  kioskBtnText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },

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

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 6 },
  photoPick: { alignItems: 'center', marginVertical: 12, gap: 6 },
  photoImg: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: COLORS.primary + '50' },
  photoPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary + '15', borderWidth: 1.5, borderColor: COLORS.primary + '40', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photoText: { fontSize: SIZES.fontXs, color: COLORS.primary, ...FONTS.semiBold },

  // Modern photo-source bottom sheet
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheetCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.darkBorder, marginBottom: 16 },
  sheetTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, textAlign: 'center' },
  sheetSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  sheetOptions: { flexDirection: 'row', gap: 12 },
  sheetOption: { flex: 1, alignItems: 'center', paddingVertical: 20, backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder },
  sheetIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sheetOptionText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  sheetOptionHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  sheetRemove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 14, borderRadius: SIZES.radius, backgroundColor: COLORS.error + '12', borderWidth: 1, borderColor: COLORS.error + '30' },
  sheetRemoveText: { fontSize: SIZES.fontMd, color: COLORS.error, ...FONTS.semiBold },
  sheetCancel: { marginTop: 12, paddingVertical: 14, borderRadius: SIZES.radius, alignItems: 'center', backgroundColor: COLORS.darkSurface },
  sheetCancelText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.semiBold },

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
