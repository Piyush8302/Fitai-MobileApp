import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch, Platform, Modal, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  useEffect(() => { AsyncStorage.getItem('themeMode').then(m => setDarkMode(m === 'dark')).catch(() => {}); }, []);

  const toggleDark = async (v) => {
    setDarkMode(v);
    await AsyncStorage.setItem('themeMode', v ? 'dark' : 'light');
    Alert.alert(v ? '🌙 Dark Mode' : '☀️ Light Mode', 'Reopen the app to apply the theme.');
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

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Settings</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        {/* Profile */}
        <View style={styles.profile}>
          <View style={styles.avatar}><Ionicons name="person" size={36} color={COLORS.textMuted} /></View>
          <Text style={styles.name}>{user?.name || user?.phone || 'Gym Owner'}</Text>
          <Text style={styles.accountType}>{isStaff ? 'Gym Staff Account' : 'Gym Owner Account'}</Text>
        </View>

        {/* Subscription & Reports — owner only (hidden for staff) */}
        {!isStaff && (
          <>
            <Text style={styles.sectionLabel}>Subscription</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient colors={isPremium ? ['#1554b8', '#1554b8'] : [COLORS.darkCard, COLORS.darkCard]} style={styles.subCard}>
                <View style={styles.subIcon}><Ionicons name={isPremium ? 'shield-checkmark' : 'diamond-outline'} size={24} color={isPremium ? '#FFF' : COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subTitle, { color: isPremium ? '#FFF' : COLORS.white }]}>{isPremium ? 'Premium Active' : 'Free Plan'}</Text>
                  <Text style={[styles.subSub, { color: isPremium ? '#FFFFFFcc' : COLORS.textMuted }]}>
                    {isPremium ? `Valid till ${sub?.expiry ? new Date(sub.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}` : 'Tap to upgrade'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Reports</Text>
            <TouchableOpacity style={styles.row} onPress={() => pickGymForReport(1)} disabled={genBusy}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.success + '15' }]}>
                {genBusy ? <ActivityIndicator size="small" color={COLORS.success} /> : <Ionicons name="document-text" size={20} color={COLORS.success} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Monthly Report (PDF)</Text>
                <Text style={styles.rowSub}>This month's attendance & payments</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => pickGymForReport(3)} disabled={genBusy}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.primary + '15' }]}>
                {genBusy ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="documents" size={20} color={COLORS.primary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Last 3 Months (PDF)</Text>
                <Text style={styles.rowSub}>Quarter attendance & payments</Text>
              </View>
              <Ionicons name="download-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* App Info */}
        <Text style={styles.sectionLabel}>App Info</Text>
        {[
          { icon: 'shield-checkmark-outline', color: '#9C27B0', title: 'Privacy Policy', sub: 'Read our privacy policy', screen: 'PrivacyPolicy' },
          { icon: 'mail-outline', color: COLORS.warning, title: 'Contact Support', sub: 'Get help from our team', screen: 'HelpSupport' },
        ].map((it, i) => (
          <TouchableOpacity key={i} style={styles.row} onPress={() => navigation.navigate(it.screen)}>
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
      <Modal visible={showReportPicker} transparent animationType="fade" onRequestClose={() => setShowReportPicker(false)}>
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  headerTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },

  profile: { alignItems: 'center', marginVertical: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.darkBorder },
  name: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginTop: 12 },
  accountType: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  sectionLabel: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold, marginHorizontal: 16, marginTop: 18, marginBottom: 10 },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, padding: 16, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder },
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
  pickCard: { backgroundColor: COLORS.darkCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  pickHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  pickTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  pickSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  pickRowAll: { borderColor: COLORS.primary + '50', backgroundColor: COLORS.primary + '10' },
  pickRowText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  pickRowSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 1 },
});

export default GymOwnerSettingsScreen;
