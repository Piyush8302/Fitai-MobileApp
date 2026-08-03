import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { downloadAndSharePdf } from '../utils/pdf';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enableAutoCheckin, disableAutoCheckin, isAutoCheckinEnabled } from '../utils/autoCheckin';

// What the gym set as this membership's state. `active` is the quiet default;
// the rest are shown loudly because they stop the member checking in and they
// used to be invisible in the app until someone asked the gym why the QR failed.
const STATUS_STYLE = {
  active: { label: 'Active', color: COLORS.success, icon: 'checkmark-circle' },
  inactive: { label: 'Deactivated', color: COLORS.warning, icon: 'pause-circle' },
  blocked: { label: 'Blocked', color: COLORS.error, icon: 'ban' },
  left: { label: 'Left', color: COLORS.textMuted, icon: 'exit-outline' },
  expired: { label: 'Expired', color: COLORS.warning, icon: 'alert-circle' },
  frozen: { label: 'Frozen', color: COLORS.warning, icon: 'snow-outline' },
};
const STATUS_NOTE = {
  inactive: 'Your membership is deactivated — you can’t check in until the gym reactivates it.',
  blocked: 'You are blocked at this gym and can’t check in. Please contact the gym team.',
  left: 'You have left this gym. Contact the gym if you want to rejoin.',
};

const MyGymCardScreen = ({ navigation }) => {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);       // gymId whose history is open
  const [history, setHistory] = useState({});           // { gymId: [attendance] }
  const qrRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [showCode, setShowCode] = useState(false); // QR/barcode collapsed by default — saves card space

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

  // ── Auto check-in (geofence) toggle ──
  const [autoOn, setAutoOn] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  useEffect(() => { isAutoCheckinEnabled().then(setAutoOn).catch(() => {}); }, []);

  const toggleAuto = async (val) => {
    if (autoBusy) return;
    setAutoBusy(true);
    try {
      if (!val) {
        await disableAutoCheckin();
        setAutoOn(false);
        return;
      }
      const gyms = (card?.gyms || []).map((g) => g.gym).filter((g) => g && g.lat != null && g.lng != null);
      if (!gyms.length) {
        Alert.alert('Gym location not set', "Your gym hasn't set its location yet. Ask the gym owner to set it (Settings → Set gym location), then try again.");
        return;
      }
      const r = await enableAutoCheckin(gyms);
      if (r.ok) {
        setAutoOn(true);
        Alert.alert('⚡ Auto check-in ON', `Attendance will be marked automatically when you arrive at your gym (within 100m) — no need to open the app.\n\nActive for ${r.count} gym${r.count > 1 ? 's' : ''}.`);
      } else if (r.reason === 'background') {
        Alert.alert('Allow "All the time"', 'For auto check-in with the app closed, Android needs location access set to "Allow all the time".\n\nOpen Settings → Apps → FitAI → Permissions → Location → Allow all the time, then turn this on again.');
      } else if (r.reason === 'foreground') {
        Alert.alert('Location needed', 'Please allow location access to use auto check-in.');
      } else {
        Alert.alert('Gym location not set', 'None of your gyms have a location set. Ask the gym owner to set it first.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not enable auto check-in. Try again.');
    } finally { setAutoBusy(false); }
  };

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

  // Download the membership card as a designed PDF (printable / saveable).
  const getQrB64 = () => new Promise((resolve) => {
    try { (qrRef.current && qrRef.current.toDataURL) ? qrRef.current.toDataURL((d) => resolve(d)) : resolve(null); }
    catch (e) { resolve(null); }
  });
  const downloadCardPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const b64 = await getQrB64();
      const name = card?.name || 'Member';
      const phone = card?.phone || '';
      const gyms = card?.gyms || [];
      const gymRows = gyms.map((g) => `<tr>
        <td style="padding:8px 10px;font-weight:600;color:#1B1D33;">${g.gym?.name || 'Gym'}</td>
        <td style="padding:8px 10px;color:#6B6B8D;">${g.plan || '-'}</td>
        <td style="padding:8px 10px;color:${g.isDue ? '#E5484D' : '#12A150'};font-weight:600;">${g.isDue ? 'Fee due' : 'Active'}</td>
      </tr>`).join('');
      const qrImg = b64
        ? `<img src="data:image/png;base64,${b64}" style="width:200px;height:200px;display:block;" />`
        : `<div style="width:200px;height:200px;"></div>`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          @page { margin:0; }
          * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          body { margin:0; font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; }
          .page { min-height:100vh; padding:48px 40px; background:linear-gradient(160deg,#6C63FF,#4B44C9 55%,#2E2A78); color:#fff; display:flex; flex-direction:column; align-items:center; }
          .brand { font-size:18px; font-weight:800; letter-spacing:2px; opacity:.9; }
          .name { font-size:36px; font-weight:800; margin:16px 0 2px; text-align:center; }
          .phone { font-size:16px; opacity:.85; margin-bottom:26px; }
          .card { background:#fff; border-radius:26px; padding:28px; text-align:center; box-shadow:0 18px 46px rgba(0,0,0,.25); }
          .qrwrap { display:inline-block; padding:14px; border:3px solid #EEE; border-radius:16px; }
          .hint { margin-top:14px; color:#6B6B8D; font-size:14px; font-weight:600; }
          .gyms { background:rgba(255,255,255,.14); border-radius:16px; margin-top:26px; width:100%; max-width:520px; overflow:hidden; }
          .gyms table { width:100%; border-collapse:collapse; background:#fff; }
          .gyms th { text-align:left; font-size:12px; letter-spacing:1px; color:#6B6B8D; padding:10px; background:#F3F3FE; }
          .foot { margin-top:auto; padding-top:26px; font-size:13px; opacity:.85; }
        </style></head>
        <body><div class="page">
          <div class="brand">FITAI · MEMBER CARD</div>
          <div class="name">${name}</div>
          <div class="phone">${phone}</div>
          <div class="card">
            <div class="qrwrap">${qrImg}</div>
            <div class="hint">Show this QR at the gym counter to check in</div>
          </div>
          ${gyms.length ? `<div class="gyms"><table>
            <tr><th>Gym</th><th>Plan</th><th>Status</th></tr>${gymRows}</table></div>` : ''}
          <div class="foot">Powered by FitAI</div>
        </div></body></html>`;
      const { savedTo } = await downloadAndSharePdf(html, `${name}-fitai-card`, `${name} — Member Card`);
      if (savedTo) Alert.alert('Downloaded', 'Your member card PDF was saved to your device.');
    } catch (e) { Alert.alert('Error', 'Could not create the PDF. Please try again.'); }
    finally { setPdfBusy(false); }
  };

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

          {showCode ? (
            <>
              {/* QR */}
              <View style={styles.qrWrap}>
                <QRCode value={qrValue} size={150} backgroundColor="#FFFFFF" color="#000000" getRef={(c) => { qrRef.current = c; }} />
              </View>
              <Text style={styles.scanHint}>Show this at the gym counter to check in</Text>

              {/* Barcode */}
              <View style={styles.barcodeWrap}>
                <Barcode value={barcodeValue} format="CODE128" height={48} singleBarWidth={1.6} backgroundColor="#FFFFFF" lineColor="#000000" />
              </View>

              <TouchableOpacity style={styles.hideCodeBtn} onPress={() => setShowCode(false)}>
                <Ionicons name="chevron-up" size={16} color={COLORS.onAccent} />
                <Text style={styles.hideCodeText}>Hide</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.showCodeBtn} onPress={() => setShowCode(true)} activeOpacity={0.8}>
              <Ionicons name="qr-code" size={22} color={COLORS.onAccent} />
              <Text style={styles.showCodeText}>Tap to show QR &amp; barcode</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.onAccent} />
            </TouchableOpacity>
          )}

          {/* Kept mounted off-screen so the PDF download always has a QR to capture,
              even if the member never taps "show" before downloading. */}
          {!showCode && (
            <View style={styles.qrHidden} pointerEvents="none">
              <QRCode value={qrValue} size={150} backgroundColor="#FFFFFF" color="#000000" getRef={(c) => { qrRef.current = c; }} />
            </View>
          )}
        </LinearGradient>

        {/* ===== DOWNLOAD PDF ===== */}
        <TouchableOpacity style={styles.downloadBtn} onPress={downloadCardPdf} disabled={pdfBusy}>
          {pdfBusy ? <ActivityIndicator color={COLORS.onAccent} size="small" /> : (
            <>
              <Ionicons name="download-outline" size={20} color={COLORS.onAccent} />
              <Text style={styles.checkinText}>Download Card (PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ===== SELF CHECK-IN ===== */}
        <TouchableOpacity
          style={styles.checkinBtn}
          onPress={() => navigation.navigate('GymScan', { mode: 'self' })}
        >
          <Ionicons name="qr-code-outline" size={20} color={COLORS.onAccent} />
          <Text style={styles.checkinText}>Scan Gym QR to Check-in</Text>
        </TouchableOpacity>

        {/* ===== AUTO CHECK-IN (geofence, works with app closed) ===== */}
        <View style={styles.autoCard}>
          <View style={styles.autoIcon}><Text style={{ fontSize: 18 }}>⚡</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoTitle}>Auto check-in</Text>
            <Text style={styles.autoSub}>Marks attendance automatically when you arrive at the gym (100m) — even with the app closed.</Text>
          </View>
          {autoBusy ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Switch
              value={autoOn}
              onValueChange={toggleAuto}
              trackColor={{ false: COLORS.darkBorder, true: COLORS.primary + '70' }}
              thumbColor={autoOn ? COLORS.primary : '#FFFFFF'}
            />
          )}
        </View>

        {/* ===== MY GYMS ===== */}
        <Text style={styles.sectionTitle}>My Gyms ({card?.gyms?.length || 0})</Text>
        {(!card?.gyms || card.gyms.length === 0) ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyText}>Not registered at any gym yet</Text>
            <Text style={styles.emptyHint}>Visit a gym & they'll add you, or scan their QR</Text>
          </View>
        ) : card.gyms.map((g) => {
          const st = STATUS_STYLE[g.status] || STATUS_STYLE.active;
          const note = STATUS_NOTE[g.status];
          return (
          <View key={g.membershipId} style={styles.gymCard}>
            <TouchableOpacity style={styles.gymRow} onPress={() => openHistory(g.gym?._id)}>
              <View style={styles.gymIcon}><Text style={{ fontSize: 20 }}>🏋️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gymName}>{g.gym?.name || 'Gym'}</Text>
                <Text style={styles.gymMeta}>
                  {g.gym?.location || g.gym?.city || ''} • {g.plan}
                </Text>
                {/* Membership state as the gym set it — updates on every load */}
                <View style={[styles.memberPill, { backgroundColor: st.color + '18', borderColor: st.color + '55' }]}>
                  <Ionicons name={st.icon} size={11} color={st.color} />
                  <Text style={[styles.memberPillText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.statusDot, { backgroundColor: g.isDue ? COLORS.error : COLORS.success }]} />
                <Text style={[styles.dueText, { color: g.isDue ? COLORS.error : COLORS.textMuted }]}>
                  {g.isDue ? 'Fee Due' : g.dueDate ? `Due ${new Date(g.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Active'}
                </Text>
                {g.fee ? <Text style={styles.feeText}>₹{g.fee}</Text> : null}
              </View>
              <Ionicons name={expanded === g.gym?._id ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {note ? (
              <View style={[styles.noteBox, { borderTopColor: st.color + '35' }]}>
                <Ionicons name="information-circle" size={14} color={st.color} />
                <Text style={[styles.noteText, { color: st.color }]}>{note}</Text>
              </View>
            ) : null}

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
                        <Text style={styles.historyMethod}>{a.method === 'auto_geo' ? '⚡' : a.method === 'self_scan' ? '📱' : '🧑‍💼'}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
          );
        })}
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
  showCodeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
    paddingVertical: 14, borderRadius: SIZES.radius, backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  showCodeText: { fontSize: SIZES.fontMd, color: COLORS.onAccent, ...FONTS.bold },
  hideCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingVertical: 4, paddingHorizontal: 10 },
  hideCodeText: { fontSize: SIZES.fontSm, color: COLORS.onAccent, opacity: 0.85, ...FONTS.semiBold },
  qrHidden: { position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden' },

  checkinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, marginTop: 16,
  },
  checkinText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.success, borderRadius: SIZES.radius, paddingVertical: 14, marginTop: 16 },
  autoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  autoIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  autoTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  autoSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2, lineHeight: 16 },

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
  feeText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  memberPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  memberPillText: { fontSize: 10, ...FONTS.bold, letterSpacing: 0.3 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  noteText: { flex: 1, fontSize: SIZES.fontXs, ...FONTS.medium, lineHeight: 16 },

  historyBox: { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  historyTitle: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.bold, marginVertical: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  historyDate: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },
  historyTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  historyMethod: { fontSize: SIZES.fontSm },
  noHistory: { fontSize: SIZES.fontSm, color: COLORS.textMuted, paddingVertical: 10, textAlign: 'center' },
});

export default MyGymCardScreen;
