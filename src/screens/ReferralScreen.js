import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReferralScreen = ({ navigation }) => {
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        const code = 'FITAI' + (user.name || 'USER').replace(/\s/g, '').toUpperCase().slice(0, 4) + String(user.id || '').slice(-4).toUpperCase();
        setReferralCode(code);
      }
    };
    load();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join FitAI and get personalized fitness plans! Use my referral code: ${referralCode}\n\nDownload: https://play.google.com/store/apps/details?id=com.piyush.fitai`,
        title: 'Refer FitAI',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not open share dialog');
    }
  };

  const rewards = [
    { icon: '🎁', title: 'Invite a Friend', desc: 'Share your unique referral code', step: '1' },
    { icon: '📲', title: 'Friend Joins', desc: 'They sign up using your code', step: '2' },
    { icon: '🏆', title: 'Both Get Rewarded', desc: 'Get 7 days free Premium each', step: '3' },
  ];

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Refer & Earn" subtitle="Invite friends, earn rewards" onBack={() => navigation.goBack()} />
      <View style={styles.content}>

        <View style={styles.codeCard}>
          <LinearGradient colors={[COLORS.primary + '20', COLORS.darkCard]} style={styles.codeGrad}>
            <Text style={styles.codeLabel}>Your Referral Code</Text>
            <Text style={styles.codeText}>{referralCode || '...'}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social" size={18} color={COLORS.white} />
              <Text style={styles.shareBtnText}>Share Code</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Text style={styles.howTitle}>How It Works</Text>
        {rewards.map((r, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{r.step}</Text></View>
            <Text style={styles.stepIcon}>{r.icon}</Text>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>{r.title}</Text>
              <Text style={styles.stepDesc}>{r.desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Friends Invited</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Days Earned</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.inviteBtn} onPress={handleShare}>
          <LinearGradient colors={COLORS.gradient1} style={styles.inviteBtnGrad}>
            <Ionicons name="people" size={20} color={COLORS.white} />
            <Text style={styles.inviteBtnText}>Invite Friends Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  codeCard: { borderRadius: SIZES.radiusLg, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: COLORS.primary + '30' },
  codeGrad: { padding: 24, alignItems: 'center', borderRadius: SIZES.radiusLg },
  codeLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 8 },
  codeText: { fontSize: 28, color: COLORS.primary, ...FONTS.bold, letterSpacing: 3, marginBottom: 16 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  shareBtnText: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.bold },
  howTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14 },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.darkBorder },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
  stepIcon: { fontSize: 28, marginRight: 12 },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  stepDesc: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.darkBorder },
  statValue: { fontSize: SIZES.fontXxl, color: COLORS.primary, ...FONTS.bold },
  statLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4 },
  inviteBtn: { borderRadius: SIZES.radius, overflow: 'hidden' },
  inviteBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8, borderRadius: SIZES.radius },
  inviteBtnText: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
});

export default ReferralScreen;
