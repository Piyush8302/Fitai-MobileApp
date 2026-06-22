import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';

// expo-camera lazy require so app never crashes if module missing (Expo Go)
let CameraView = null, useCameraPermissions = null;
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch (e) { /* not available */ }

const GymScanScreen = ({ navigation, route }) => {
  const mode = route?.params?.mode || 'self';   // 'self' (member scans gym QR) | 'staff' (staff scans member QR)
  const gymId = route?.params?.gymId;
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, () => {}];
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (useCameraPermissions && permission && !permission.granted) requestPermission();
  }, [permission]);

  const handleScan = async ({ data }) => {
    if (lock.current || scanned) return;
    lock.current = true;
    setScanned(true);
    setProcessing(true);
    try {
      if (mode === 'staff') {
        // member QR payload = "FITAI-USER:<userId>"
        const userId = String(data).startsWith('FITAI-USER:') ? String(data).split(':')[1] : data;
        const res = await api.post(ENDPOINTS.GYM_ATTENDANCE, { gymId, userId });
        if (res.success) {
          Alert.alert(res.data?.duplicate ? 'Already checked in' : '✅ Attendance marked', res.data?.member?.name || 'Member', [
            { text: 'Scan next', onPress: reset },
            { text: 'Done', onPress: () => navigation.goBack() },
          ]);
        } else { Alert.alert('Error', res.message || 'Not a valid member', [{ text: 'Retry', onPress: reset }]); }
      } else {
        // self: gym QR = web URL ".../g/<code>", or "FITAI-GYM:<code>", or raw code
        let gymCode = String(data).trim();
        if (gymCode.includes('/g/')) gymCode = gymCode.split('/g/').pop().split(/[/?#]/)[0];
        else if (gymCode.startsWith('FITAI-GYM:')) gymCode = gymCode.split(':')[1];
        const res = await api.post(ENDPOINTS.GYM_MY_CHECKIN, { gymCode });
        if (res.success) {
          Alert.alert('✅ Checked in', res.message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } else { Alert.alert('Error', res.message || 'Invalid gym QR', [{ text: 'Retry', onPress: reset }]); }
      }
    } catch (e) {
      Alert.alert('Error', 'Scan failed', [{ text: 'Retry', onPress: reset }]);
    } finally { setProcessing(false); }
  };

  const reset = () => { lock.current = false; setScanned(false); };

  // Camera module not available (Expo Go)
  if (!CameraView) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.msg}>Camera scanning works in the built APK (not Expo Go).</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  if (!permission) return <View style={[styles.container, styles.center]}><ActivityIndicator color={COLORS.primary} /></View>;
  if (!permission.granted) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.msg}>Camera permission needed to scan QR.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow Camera</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{mode === 'staff' ? 'Scan Member QR' : 'Scan Gym QR'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.frame} />
        <Text style={styles.hint}>
          {mode === 'staff' ? "Point at member's QR card to mark attendance" : 'Point at the gym counter QR to check in'}
        </Text>

        {processing && (
          <View style={styles.processing}>
            <ActivityIndicator color="#FFF" />
            <Text style={styles.processingText}>Marking…</Text>
          </View>
        )}
        {scanned && !processing && (
          <TouchableOpacity style={styles.rescanBtn} onPress={reset}>
            <Text style={styles.rescanText}>Tap to scan again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 },
  msg: { color: COLORS.textSecondary, fontSize: SIZES.fontMd, textAlign: 'center', ...FONTS.medium },
  btn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: SIZES.radius },
  btnText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },

  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 54, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: SIZES.fontLg, ...FONTS.bold },
  frame: { width: 250, height: 250, borderRadius: 24, borderWidth: 3, borderColor: '#FFF' },
  hint: { color: '#FFF', fontSize: SIZES.fontMd, ...FONTS.medium, textAlign: 'center', marginTop: 24, paddingHorizontal: 40 },
  processing: { position: 'absolute', bottom: 80, flexDirection: 'row', alignItems: 'center', gap: 10 },
  processingText: { color: '#FFF', fontSize: SIZES.fontMd, ...FONTS.bold },
  rescanBtn: { position: 'absolute', bottom: 80, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: SIZES.radius },
  rescanText: { color: COLORS.onAccent, fontSize: SIZES.fontMd, ...FONTS.bold },
});

export default GymScanScreen;
