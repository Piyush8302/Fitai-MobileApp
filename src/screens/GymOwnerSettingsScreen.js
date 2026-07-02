import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch, Platform, Modal, RefreshControl, Image, TextInput, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadApp } from '../utils/reload';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const GymOwnerSettingsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [sub, setSub] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [reportMonths, setReportMonths] = useState(1); // 1 = current month, 3 = last 3 months
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await load(); } catch (e) {} setRefreshing(false); };
  const [showChangeReq, setShowChangeReq] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');
  const [reqBusy, setReqBusy] = useState(false);

  // Owner & staff can change their profile photo
  const [photoBusy, setPhotoBusy] = useState(false);
  const pickAndUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to set a profile picture.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const avatar = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoBusy(true);
      const res = await api.put(ENDPOINTS.UPLOAD_AVATAR, { avatar });
      if (res.success) {
        const updated = { ...(user || {}), avatar };
        setUser(updated);
        await AsyncStorage.setItem('user', JSON.stringify(updated));
      } else Alert.alert('Error', res.message || 'Could not update photo');
    } catch (e) { Alert.alert('Error', 'Could not update photo'); }
    finally { setPhotoBusy(false); }
  };

  const submitChangeReq = async () => {
    if (!changeMsg.trim()) { Alert.alert('Required', 'Describe the change you want'); return; }
    setReqBusy(true);
    try {
      const res = await api.post(ENDPOINTS.SUPPORT, { message: `[Profile change request] ${changeMsg.trim()}` });
      if (res.success) { setShowChangeReq(false); Alert.alert('Request sent', 'Our team will review your email/phone change request.'); }
      else Alert.alert('Error', res.message || 'Could not send');
    } catch (e) { Alert.alert('Error', 'Network error. Please try again.'); }
    finally { setReqBusy(false); }
  };

  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      const [me, s, g] = await Promise.all([
        api.get(ENDPOINTS.GET_ME),
        api.get(ENDPOINTS.MY_SUBSCRIPTION).catch(() => ({})),
        api.get(ENDPOINTS.GYM_MINE).catch(() => ({})),
      ]);
      if (me.success) setUser(me.user || me.data);
      if (s.success) setSub(s.data);
      if (g.success) setGyms(g.data);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  // Reload on focus so a freshly-granted reports permission shows without restart.
  useEffect(() => { const unsub = navigation.addListener('focus', () => load()); return unsub; }, [navigation, load]);
  useEffect(() => { AsyncStorage.getItem('themeMode').then(m => setDarkMode(m === 'dark')).catch(() => {}); }, []);

  const toggleDark = async (v) => {
    setDarkMode(v);
    await AsyncStorage.setItem('themeMode', v ? 'dark' : 'light');
    const ok = await reloadApp();
    if (!ok) Alert.alert(v ? '🌙 Dark Mode' : '☀️ Light Mode', 'Theme saved! Reopen the app to apply.');
  };

  const logout = () => {
    Alert.alert('Logout?', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['token', 'user', 'loginRole', 'activeGymId']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  // ===== PDF MONTHLY REPORT =====
  const generateReport = async (gym, months = reportMonths) => {
    setGenBusy(true);
    try {
      const res = await api.get(`/api/gym/${gym._id}/report?month=${monthKey(new Date())}&months=${months}`);
      if (!res.success) { Alert.alert('Error', 'Could not load report'); setGenBusy(false); return; }
      const { rows, totals, month } = res.data;
      const reportTitle = months > 1 ? `${months}-Month Report` : 'Monthly Report';

      const rowsHtml = rows.map((r, i) => `
        <tr style="background:${i % 2 ? '#f5f6fb' : '#fff'}">
          <td>${i + 1}</td>
          <td>${r.name}</td>
          <td>${r.phone}</td>
          <td style="text-transform:capitalize">${r.plan}</td>
          <td style="text-align:center">${r.present}</td>
          <td style="text-align:right">₹${r.paid}</td>
          <td style="text-align:center;color:${r.isDue ? '#E53935' : '#3E9D43'}">${r.isDue ? 'Due' : 'Paid'}</td>
        </tr>`).join('');

      const html = `
        <html><head><meta name="viewport" content="width=device-width"/>
        <style>
          body{font-family:-apple-system,Roboto,sans-serif;color:#1b1d33;padding:24px}
          h1{color:#1554b8;margin:0}
          .sub{color:#6b6b8d;margin:2px 0 18px}
          .cards{display:flex;gap:10px;margin-bottom:18px}
          .card{flex:1;border:1px solid #e0e2f0;border-radius:10px;padding:12px;text-align:center}
          .card .v{font-size:22px;font-weight:700;color:#1554b8}
          .card .l{font-size:11px;color:#6b6b8d}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th{background:#1554b8;color:#fff;padding:8px;text-align:left}
          td{padding:8px;border-bottom:1px solid #eee}
        </style></head><body>
          <h1>${gym.name}</h1>
          <div class="sub">${gym.location || ''} • ${reportTitle} — ${month}</div>
          <div class="cards">
            <div class="card"><div class="v">${totals.members}</div><div class="l">Members</div></div>
            <div class="card"><div class="v">${totals.totalPresent}</div><div class="l">Total Check-ins</div></div>
            <div class="card"><div class="v">₹${totals.totalCollected}</div><div class="l">Collected</div></div>
            <div class="card"><div class="v">${totals.totalDue}</div><div class="l">Fee Due</div></div>
          </div>
          <table>
            <tr><th>#</th><th>Name</th><th>Phone</th><th>Plan</th><th>Present</th><th>Paid</th><th>Status</th></tr>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center;padding:20px">No members</td></tr>'}
          </table>
          <p style="margin-top:24px;color:#9092b0;font-size:11px">Generated by FitAI • ${new Date().toLocaleString('en-IN')}</p>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${gym.name} Report` });
      else Alert.alert('Saved', `Report saved: ${uri}`);
    } catch (e) {
      Alert.alert('Error', 'PDF generation needs the built APK. Rebuild to use reports.');
    } finally { setGenBusy(false); }
  };

  const pickGymForReport = (months = 1) => {
    if (gyms.length === 0) { Alert.alert('No gym', 'Create a gym first'); return; }
    setReportMonths(months);
    if (gyms.length === 1) { generateReport(gyms[0], months); return; }
    setShowReportPicker(true);
  };

  // ===== COMBINED PDF — all gyms in one report =====
  const generateAllReport = async (months = reportMonths) => {
    setShowReportPicker(false);
    setGenBusy(true);
    try {
      const month = monthKey(new Date());
      const results = [];
      for (const g of gyms) {
        const res = await api.get(`/api/gym/${g._id}/report?month=${month}&months=${months}`);
        if (res.success) results.push({ gym: g, ...res.data });
      }
      if (!results.length) { Alert.alert('Error', 'Could not load reports'); setGenBusy(false); return; }

      const monthLabel = results[0].month;
      const grand = results.reduce((a, r) => ({
        members: a.members + r.totals.members,
        present: a.present + r.totals.totalPresent,
        collected: a.collected + r.totals.totalCollected,
        due: a.due + r.totals.totalDue,
      }), { members: 0, present: 0, collected: 0, due: 0 });

      const sections = results.map(r => {
        const rowsHtml = r.rows.map((row, i) => `
          <tr style="background:${i % 2 ? '#f5f6fb' : '#fff'}">
            <td>${i + 1}</td><td>${row.name}</td><td>${row.phone}</td>
            <td style="text-transform:capitalize">${row.plan}</td>
            <td style="text-align:center">${row.present}</td>
            <td style="text-align:right">₹${row.paid}</td>
            <td style="text-align:center;color:${row.isDue ? '#E53935' : '#3E9D43'}">${row.isDue ? 'Due' : 'Paid'}</td>
          </tr>`).join('');
        return `
          <h2 style="color:#1554b8;margin:22px 0 2px">${r.gym.name}</h2>
          <div style="color:#6b6b8d;font-size:12px;margin-bottom:8px">${r.gym.location || ''} • ${r.totals.members} members • ₹${r.totals.totalCollected} collected • ${r.totals.totalDue} due</div>
          <table>
            <tr><th>#</th><th>Name</th><th>Phone</th><th>Plan</th><th>Present</th><th>Paid</th><th>Status</th></tr>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center;padding:12px">No members</td></tr>'}
          </table>`;
      }).join('');

      const html = `
        <html><head><meta name="viewport" content="width=device-width"/>
        <style>
          body{font-family:-apple-system,Roboto,sans-serif;color:#1b1d33;padding:24px}
          h1{color:#1554b8;margin:0}
          .sub{color:#6b6b8d;margin:2px 0 18px}
          .cards{display:flex;gap:10px;margin-bottom:18px}
          .card{flex:1;border:1px solid #e0e2f0;border-radius:10px;padding:12px;text-align:center}
          .card .v{font-size:22px;font-weight:700;color:#1554b8}
          .card .l{font-size:11px;color:#6b6b8d}
          table{width:100%;border-collapse:collapse;font-size:12px}
          th{background:#1554b8;color:#fff;padding:8px;text-align:left}
          td{padding:8px;border-bottom:1px solid #eee}
        </style></head><body>
          <h1>All Gyms — Combined Report</h1>
          <div class="sub">${results.length} branches • ${monthLabel}</div>
          <div class="cards">
            <div class="card"><div class="v">${grand.members}</div><div class="l">Members</div></div>
            <div class="card"><div class="v">${grand.present}</div><div class="l">Total Check-ins</div></div>
            <div class="card"><div class="v">₹${grand.collected}</div><div class="l">Collected</div></div>
            <div class="card"><div class="v">${grand.due}</div><div class="l">Fee Due</div></div>
          </div>
          ${sections}
          <p style="margin-top:24px;color:#9092b0;font-size:11px">Generated by FitAI • ${new Date().toLocaleString('en-IN')}</p>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'All Gyms Report' });
      else Alert.alert('Saved', `Report saved: ${uri}`);
    } catch (e) {
      Alert.alert('Error', 'PDF generation needs the built APK. Rebuild to use reports.');
    } finally { setGenBusy(false); }
  };

  if (loading) return <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></LinearGradient>;

  const isPremium = sub?.isPremium;
  const isStaff = (user?.role) === 'gym_staff';
  const realEmail = user?.email && !/@fitai\.(temp|local)$/.test(user.email) ? user.email : null;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Settings</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        {/* Profile — gradient hero */}
        <LinearGradient colors={COLORS.gradient1} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profile}>
          <TouchableOpacity onPress={pickAndUploadPhoto} activeOpacity={0.8} disabled={photoBusy}>
            {user?.avatar && /^(data:|http)/.test(String(user.avatar)) ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}><Ionicons name="person" size={36} color={COLORS.onAccent} /></View>
            )}
            <View style={styles.camBadge}>
              {photoBusy ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="camera" size={15} color={COLORS.primary} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name || user?.phone || 'Gym Owner'}</Text>
          <Text style={styles.accountType}>{isStaff ? 'Gym Staff Account' : 'Gym Owner Account'}</Text>
        </LinearGradient>

        {/* Profile details */}
        <View style={styles.profileCard}>
          <PRow icon="call-outline" label="Phone" value={user?.phone || '—'} />
          <PRow icon="mail-outline" label="Email" value={realEmail || 'Not set'} />
          <PRow icon="calendar-outline" label="Joined" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} last />
        </View>
        <TouchableOpacity style={styles.reqBtn} onPress={() => { setChangeMsg(''); setShowChangeReq(true); }}>
          <Ionicons name="create-outline" size={16} color={COLORS.primary} />
          <Text style={styles.reqText}>Request email / phone change</Text>
        </TouchableOpacity>

        {/* Subscription — owner only */}
        {!isStaff && (
          <>
            <Text style={styles.sectionLabel}>Subscription</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient colors={isPremium ? COLORS.gradient1 : [COLORS.darkCard, COLORS.darkCard]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.subCard, isPremium && styles.subCardPremium]}>
                <View style={styles.subIcon}><Ionicons name={isPremium ? 'shield-checkmark' : 'diamond-outline'} size={24} color={isPremium ? '#FFF' : COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subTitle, { color: isPremium ? '#FFF' : COLORS.white }]}>{isPremium ? 'Premium Active' : 'Free Plan'}</Text>
                  <Text style={[styles.subSub, { color: isPremium ? '#FFFFFFcc' : COLORS.textMuted }]}>
                    {isPremium ? `Valid till ${sub?.expiry ? new Date(sub.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}` : 'Tap to upgrade'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* Reports — owner, or a staff the owner granted reports access */}
        {(!isStaff || user?.canAccessReports) && (
          <>
            <Text style={styles.sectionLabel}>Reports</Text>
            <TouchableOpacity style={styles.row} onPress={() => pickGymForReport(1)} disabled={genBusy}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.success + '15' }]}>
                {genBusy && reportMonths === 1 ? <ActivityIndicator size="small" color={COLORS.success} /> : <Ionicons name="document-text" size={20} color={COLORS.success} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Monthly Report (PDF)</Text>
                <Text style={styles.rowSub}>{genBusy && reportMonths === 1 ? 'Preparing your PDF…' : "This month's attendance & payments"}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => pickGymForReport(3)} disabled={genBusy}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.primary + '15' }]}>
                {genBusy && reportMonths === 3 ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="documents" size={20} color={COLORS.primary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Last 3 Months (PDF)</Text>
                <Text style={styles.rowSub}>{genBusy && reportMonths === 3 ? 'Preparing your PDF…' : 'Quarter attendance & payments'}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* App Info */}
        <Text style={styles.sectionLabel}>App Info</Text>
        {[
          { icon: 'shield-checkmark-outline', color: '#9C27B0', title: 'Privacy Policy', sub: 'Read our privacy policy', screen: 'PrivacyPolicy' },
          { icon: 'mail-outline', color: COLORS.warning, title: 'Contact Support', sub: 'Get help from our team', screen: 'HelpSupport', params: { audience: 'admin' } },
        ].map((it, i) => (
          <TouchableOpacity key={i} style={styles.row} onPress={() => navigation.navigate(it.screen, it.params)}>
            <View style={[styles.rowIcon, { backgroundColor: it.color + '15' }]}><Ionicons name={it.icon} size={20} color={it.color} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{it.title}</Text>
              <Text style={styles.rowSub}>{it.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Dark mode */}
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: COLORS.primary + '15' }]}><Ionicons name={darkMode ? 'moon' : 'sunny'} size={20} color={COLORS.primary} /></View>
          <Text style={[styles.rowTitle, { flex: 1 }]}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={toggleDark} trackColor={{ false: COLORS.darkBorder, true: COLORS.primary + '70' }} thumbColor={darkMode ? COLORS.primary : '#FFF'} />
        </View>

        {/* About */}
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: COLORS.accent + '15' }]}><Ionicons name="information-circle-outline" size={20} color={COLORS.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>About</Text>
            <Text style={styles.rowSub}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===== REPORT GYM PICKER (with close cross + All-Gyms option) ===== */}
      <Modal visible={showReportPicker} transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={() => setShowReportPicker(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.pickBackdrop} onPress={() => setShowReportPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.pickCard} onPress={() => {}}>
            <View style={styles.pickHeader}>
              <View>
                <Text style={styles.pickTitle}>{reportMonths > 1 ? `Last ${reportMonths} Months` : 'Monthly Report'}</Text>
                <Text style={styles.pickSub}>Choose a gym, or download all combined</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportPicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* All gyms combined */}
            <TouchableOpacity style={[styles.pickRow, styles.pickRowAll]} onPress={() => generateAllReport()}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="albums" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickRowText}>All Gyms (combined)</Text>
                <Text style={styles.pickRowSub}>One PDF with every branch</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            {gyms.map((g) => (
              <TouchableOpacity key={g._id} style={styles.pickRow} onPress={() => { setShowReportPicker(false); generateReport(g); }}>
                <View style={[styles.rowIcon, { backgroundColor: COLORS.success + '15' }]}>
                  <Ionicons name="barbell" size={20} color={COLORS.success} />
                </View>
                <Text style={[styles.pickRowText, { flex: 1 }]}>{g.name}</Text>
                <Ionicons name="download-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== REQUEST EMAIL/PHONE CHANGE ===== */}
      <Modal visible={showChangeReq} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={() => setShowChangeReq(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.reqWrap}>
          <View style={styles.reqCard}>
            <View style={styles.reqHead}>
              <Text style={styles.reqTitle}>Request a change</Text>
              <TouchableOpacity onPress={() => setShowChangeReq(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.reqSub}>For security, email & phone are changed by our team. Tell us your new email/phone and we'll update it.</Text>
            <TextInput
              style={styles.reqInput}
              placeholder="e.g. Please change my phone to 98xxxxxxxx / email to me@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={changeMsg}
              onChangeText={setChangeMsg}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.reqSubmit} onPress={submitChangeReq} disabled={reqBusy}>
              {reqBusy ? <ActivityIndicator color={COLORS.onAccent} /> : <Text style={styles.reqSubmitText}>Send Request</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
};

const PRow = ({ icon, label, value, last }) => (
  <View style={[styles.pRow, !last && styles.pRowBorder]}>
    <Ionicons name={icon} size={18} color={COLORS.textMuted} />
    <Text style={styles.pLabel}>{label}</Text>
    <Text style={styles.pValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  headerTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },

  profile: { alignItems: 'center', marginHorizontal: 16, marginTop: 4, marginBottom: 16, paddingVertical: 24, borderRadius: SIZES.radiusXl, ...SHADOWS.medium },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  avatarImg: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  camBadge: { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.onAccent },
  name: { fontSize: SIZES.fontXl, color: COLORS.onAccent, ...FONTS.bold, marginTop: 12 },
  accountType: { fontSize: SIZES.fontSm, color: 'rgba(255,255,255,0.85)', ...FONTS.medium, marginTop: 2 },

  profileCard: { marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 4, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  pRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  pLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, width: 70 },
  pValue: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold, textAlign: 'right' },
  reqBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 10, paddingVertical: 10 },
  reqText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.semiBold },

  reqWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  reqCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 44 },
  reqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  reqSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 6, marginBottom: 14, lineHeight: 19 },
  reqInput: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, padding: 14, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium, minHeight: 90 },
  reqSubmit: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  reqSubmitText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },

  sectionLabel: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold, marginHorizontal: 16, marginTop: 18, marginBottom: 10 },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, padding: 16, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder },
  subCardPremium: { borderWidth: 0, ...SHADOWS.glow(COLORS.primary) },
  subIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center' },
  subTitle: { fontSize: SIZES.fontLg, ...FONTS.bold },
  subSub: { fontSize: SIZES.fontSm, ...FONTS.medium, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginBottom: 10, padding: 14, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  rowSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 1 },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 14, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '40' },
  logoutText: { color: COLORS.error, fontSize: SIZES.fontMd, ...FONTS.bold },

  // Report gym picker
  pickBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 46 },
  pickHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  pickTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  pickSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  pickRowAll: { borderColor: COLORS.primary + '50', backgroundColor: COLORS.primary + '10' },
  pickRowText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  pickRowSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 1 },
});

export default GymOwnerSettingsScreen;
